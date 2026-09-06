export const invoke = async () => null;
export const listen = async () => () => {};
export const emit = async () => {};
export const getCurrentWindow = () => ({
  hide: async () => {},
  show: async () => {},
  close: async () => {},
  minimize: async () => {},
  maximize: async () => {},
  toggleMaximize: async () => {},
  isMaximized: async () => false,
  startDragging: async () => {},
  onCloseRequested: async () => () => {},
});
export const getVersion = async () => "1.0.0";
export const check = async () => null;
export const relaunch = async () => {};
export const isPermissionGranted = async () => false;
export const requestPermission = async () => "denied";
export const sendNotification = () => {};
export const writeText = async () => {};
export const readText = async () => "";
export const enable = async () => {};
export const disable = async () => {};
export const isEnabled = async () => false;
export default {};
