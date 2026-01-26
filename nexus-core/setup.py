from setuptools import setup, find_packages

setup(
    name="nexus-analyzer-core",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "scapy",
        "pandas",
        "numpy",
    ],
    entry_points={
        "console_scripts": [
            "nexus-core=nexus_core.cli:main",
        ],
    },
)
