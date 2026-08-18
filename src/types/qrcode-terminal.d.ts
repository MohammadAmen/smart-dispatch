declare module "qrcode-terminal" {
  interface GenerateOptions {
    small?: boolean;
  }

  interface QrcodeTerminal {
    generate(
      input: string,
      opts?: GenerateOptions,
      cb?: (qrcode: string) => void,
    ): void;
    error: number;
  }

  const qrcodeTerminal: QrcodeTerminal;
  export default qrcodeTerminal;
}
