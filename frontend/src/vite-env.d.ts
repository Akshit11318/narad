/// <reference types="vite/client" />

interface Window {
  createEncryptionModule: () => Promise<any>;
}

declare module "*.wasm" {
  const content: any;
  export default content;
}