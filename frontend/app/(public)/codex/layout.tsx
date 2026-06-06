import { metadata as codexMetadata } from "./metadata";

export const metadata = codexMetadata;

export default function CodexLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
