// UniversalDriver.js
// The explicit bridge to the UniversalManager router in the backend.

const UniversalDriver = {
    /**
     * Invoke a tool action.
     * @param {string} toolId - The unique ID of the tool (e.g., 'nexus.network.ping')
     * @param {string} action - The action to perform ('run', 'stop', 'get_metadata')
     * @param {object} payload - The data payload to send
     * @returns {Promise<any>}
     */
    invoke: async (toolId, action, payload = {}) => {
        if (!window.pywebview || !window.pywebview.api) {
            console.warn('[UniversalDriver] pywebview API not available. Mocking response.');
            return new Promise(resolve => setTimeout(() => resolve({ status: 'mock_success' }), 500));
        }

        try {
            return await window.pywebview.api.universal_invoke(toolId, action, payload);
        } catch (error) {
            console.error(`[UniversalDriver] Import failed for ${toolId}:`, error);
            throw error;
        }
    },

    /**
     * Get metadata for all available tools.
     * @returns {Promise<Array>}
     */
    getMetadata: async () => {
        if (!window.pywebview || !window.pywebview.api) {
            return [];
        }
        return await window.pywebview.api.universal_get_metadata();
    },

    /**
     * Helper to subscribe to tool events.
     * @param {string} toolId - Tool ID
     * @param {string} eventType - Event suffix (e.g., 'log', 'data')
     * @param {function} callback - Event handler
     * @returns {function} cleanup function
     */
    on: (toolId, eventType, callback) => {
        const fullEventType = `${toolId}:${eventType}`;

        const handler = (event) => {
            // The detail contains the payload sent from backend
            callback(event.detail);
        };

        window.addEventListener(fullEventType, handler);
        return () => window.removeEventListener(fullEventType, handler);
    }
};

export default UniversalDriver;
