import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import os
import glob
from datetime import datetime

# 设置中文字体，防止乱码
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False

def parse_wifi_data(filepath):
    """解析 WiFi 监控数据"""
    print(f"Loading WiFi data from {filepath}...")
    try:
        # 读取 CSV，处理列名空格
        df = pd.read_csv(filepath, skipinitialspace=True)
        # 去除列名两端的空格
        df.columns = df.columns.str.strip()
        
        # 检查必要的列
        required_cols = ['时间戳', '整体占用率', '同频邻频干扰', '正常接收', '干扰贡献度']
        for col in required_cols:
            if col not in df.columns:
                print(f"Warning: Column {col} not found in WiFi CSV.")
                return None
        
        # 转换时间戳 (假设是毫秒)
        # 注意: 时间戳通常是UTC，而日志字符串时间通常是本地时间(UTC+8)
        # 为了对齐，将时间戳转换为 UTC+8
        df['Datetime'] = pd.to_datetime(df['时间戳'], unit='ms') + pd.Timedelta(hours=8)
        
        # 设置索引
        df.set_index('Datetime', inplace=True)
        
        return df
    except Exception as e:
        print(f"Error parsing WiFi data: {e}")
        return None

def parse_fps_data(filepath):
    """解析帧率数据"""
    print(f"Loading FPS data from {filepath}...")
    try:
        # 无表头：TimeStr, FPS
        df = pd.read_csv(filepath, header=None, names=['TimeStr', 'FPS'])
        
        # 解析时间字符串: 2025-12-26-14:56:26.036
        # 格式: %Y-%m-%d-%H:%M:%S.%f
        df['Datetime'] = pd.to_datetime(df['TimeStr'], format='%Y-%m-%d-%H:%M:%S.%f')
        
        # 设置索引
        df.set_index('Datetime', inplace=True)
        
        return df[['FPS']]
    except Exception as e:
        print(f"Error parsing FPS data: {e}")
        return None

def analyze_periodicity(df):
    """分析 FPS 数据的周期性和频谱特征"""
    print("Analyzing periodicity and spectrum...")
    
    # 准备数据：确保无空值 (用前值填充或0填充)
    # 使用 ffill() 替代 method='ffill' 以兼容新版 pandas
    fps_series = df['FPS'].ffill().fillna(0)
    data = fps_series.values
    n = len(data)
    
    if n < 2:
        print("Not enough data for periodicity analysis.")
        return

    # 采样频率 (我们已经重采样到 1s)
    fs = 1.0 
    
    # 1. 自相关分析 (Autocorrelation)
    # 计算 lags, 只计算一部分以免计算量过大，例如前 600 秒 (10分钟)
    max_lags = min(600, n // 2)
    # 使用 numpy 计算自相关
    # 减去均值以消除直流分量对相关性的影响
    data_centered = data - np.mean(data)
    # 完整互相关
    acf_full = np.correlate(data_centered, data_centered, mode='full')
    # 取后半段 (0 lag 之后)
    acf = acf_full[n-1:] 
    # 归一化 (防止除以0)
    if acf[0] != 0:
        acf = acf / acf[0]
    
    acf = acf[:max_lags]
    lags = np.arange(max_lags)

    # 2. 频域分析 (FFT)
    # 去直流
    fft_vals = np.fft.fft(data_centered)
    fft_freqs = np.fft.fftfreq(n, d=1.0/fs)
    
    # 取正频率部分
    pos_mask = fft_freqs > 0
    freqs = fft_freqs[pos_mask]
    power = np.abs(fft_vals[pos_mask])**2
    # 归一化功率
    power = power / n

    # 绘图
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))
    fig.suptitle('FPS 周期性与频域分析', fontsize=16)

    # 自相关图
    ax1.plot(lags, acf)
    ax1.set_title('自相关函数 (Autocorrelation)')
    ax1.set_xlabel('滞后 (Lag) [秒]')
    ax1.set_ylabel('相关系数')
    ax1.grid(True)
    # 标记显著峰值 (简单标记)
    # 忽略 lag=0
    if len(acf) > 1:
        # 寻找第一个显著峰值（简单的局部最大值），忽略 lag=0 附近的下降
        # 简单的启发式：找 lag > 5 后的最大值
        search_start = 5
        if len(acf) > search_start:
            peak_idx = np.argmax(acf[search_start:]) + search_start
            peak_val = acf[peak_idx]
            if peak_val > 0.3: # 只有相关性显著才标记
                ax1.annotate(f'Peak Lag: {lags[peak_idx]}s\nCorr: {peak_val:.2f}', 
                            xy=(lags[peak_idx], acf[peak_idx]), 
                            xytext=(lags[peak_idx]+10, acf[peak_idx]+0.1),
                            arrowprops=dict(facecolor='black', shrink=0.05))

    # 频谱图
    ax2.plot(freqs, power)
    ax2.set_title('功率谱密度 (Power Spectrum)')
    ax2.set_xlabel('频率 (Hz)')
    ax2.set_ylabel('功率')
    ax2.grid(True)
    
    # 找出主要频率成分
    if len(power) > 0:
        dom_freq_idx = np.argmax(power)
        dom_freq = freqs[dom_freq_idx]
        period = 1.0 / dom_freq if dom_freq > 0 else 0
        ax2.annotate(f'Main Freq: {dom_freq:.4f} Hz\n(Period: {period:.1f} s)', 
                     xy=(dom_freq, power[dom_freq_idx]), 
                     xytext=(dom_freq + 0.01, power[dom_freq_idx]),
                     arrowprops=dict(facecolor='red', shrink=0.05))

    plt.tight_layout()

def main():
    # 数据目录
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data', '20260122-八代机测试')
    output_dir = os.path.join(base_dir, 'output')
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # 查找文件
    wifi_files = glob.glob(os.path.join(data_dir, 'wifi_monitor_*.csv'))
    fps_files = glob.glob(os.path.join(data_dir, 'frame_rate_*.csv'))
    
    if not wifi_files or not fps_files:
        print("Error: Could not find data files.")
        return

    # 假设只处理第一个匹配的文件
    wifi_path = wifi_files[0]
    fps_path = fps_files[0]

    df_wifi = parse_wifi_data(wifi_path)
    df_fps = parse_fps_data(fps_path)

    if df_wifi is None or df_fps is None:
        return

    # 筛选 WiFi 数据中需要的数值列，避免非数值列（如时间字符串、频宽字符串）导致重采样报错
    wifi_numeric_cols = ['整体占用率', '同频邻频干扰', '正常接收', '干扰贡献度']
    # 过滤掉不存在的列
    wifi_numeric_cols = [c for c in wifi_numeric_cols if c in df_wifi.columns]
    df_wifi_subset = df_wifi[wifi_numeric_cols]

    # 对齐数据：重采样到 1秒 间隔
    print("Resampling data to 1s intervals...")
    # 使用 numeric_only=True 防止任何潜在的非数值列报错
    df_wifi_1s = df_wifi_subset.resample('1s').mean(numeric_only=True)
    df_fps_1s = df_fps.resample('1s').mean(numeric_only=True)

    # 合并
    print("Merging data...")
    # inner join 也就是只保留两者时间重叠的部分
    df_merged = df_wifi_1s.join(df_fps_1s, how='inner')
    
    if df_merged.empty:
        print("Warning: No overlapping time period found between WiFi and FPS data.")
        # 尝试 outer join 以查看时间范围
        print("Attempting outer join for debugging...")
        df_outer = df_wifi_1s.join(df_fps_1s, how='outer')
        print(f"WiFi Range: {df_wifi.index.min()} to {df_wifi.index.max()}")
        print(f"FPS Range:  {df_fps.index.min()} to {df_fps.index.max()}")
        return

    print(f"Analysis period: {df_merged.index.min()} to {df_merged.index.max()}")

    # 执行周期性分析
    analyze_periodicity(df_merged)

    # 绘图
    fig, ax1 = plt.subplots(figsize=(15, 8))

    # X轴: 时间
    ax1.set_xlabel('时间 (Time)')
    ax1.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M:%S'))
    ax1.xaxis.set_major_locator(mdates.AutoDateLocator())

    # Y1轴: 帧率
    color = 'tab:blue'
    ax1.set_ylabel('传屏帧率 (FPS)', color=color, fontweight='bold')
    line1 = ax1.plot(df_merged.index, df_merged['FPS'], color=color, label='传屏帧率 (FPS)', linewidth=2)
    ax1.tick_params(axis='y', labelcolor=color)
    ax1.set_ylim(0, 65)  # 假设最大60帧

    # Y2轴: 占用率等百分比
    ax2 = ax1.twinx()
    ax2.set_ylabel('百分比 (%)', color='tab:red', fontweight='bold')
    
    # 绘制 WiFi 统计曲线
    line2 = ax2.plot(df_merged.index, df_merged['整体占用率'], color='tab:red', linestyle='--', label='整体占用率', alpha=0.7)
    # line3 = ax2.plot(df_merged.index, df_merged['同频邻频干扰'], color='tab:orange', linestyle='-.', label='同频邻频干扰', alpha=0.7)
    # line4 = ax2.plot(df_merged.index, df_merged['正常接收'], color='tab:green', linestyle=':', label='正常接收', alpha=0.7)
    # line5 = ax2.plot(df_merged.index, df_merged['干扰贡献度'], color='purple', linestyle='-', label='干扰贡献度', alpha=0.5)

    ax2.tick_params(axis='y', labelcolor='tab:red')
    ax2.set_ylim(0, 100)

    # 标题
    plt.title('WiFi 环境与传屏帧率关联分析', fontsize=16)
    plt.grid(True, which='both', linestyle='--', alpha=0.5)

    # 合并图例
    # lines = line1 + line2 + line3 + line4 + line5
    lines = line1 + line2
    labels = [l.get_label() for l in lines]
    ax1.legend(lines, labels, loc='upper left', bbox_to_anchor=(0, 1.1), ncol=5)

    plt.tight_layout()
    
    # output_path = os.path.join(output_dir, 'wifi_fps_analysis.png')
    # plt.savefig(output_path, dpi=300)
    # print(f"Graph saved to {output_path}")

    # Optional: 显示图表 (如果在支持 GUI 的环境)
    print("Opening interactive plot window...")
    plt.show()

if __name__ == "__main__":
    main()
