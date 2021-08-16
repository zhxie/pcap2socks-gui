declare global {
    interface Window {
        __TAURI__: any,
        __TAURI_INVOKE_HANDLER__: any
    }
}

export { }