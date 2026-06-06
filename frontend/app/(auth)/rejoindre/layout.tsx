import { metadata as rejoindreMetadata } from "./metadata";

export const metadata = rejoindreMetadata;

export default function RejoindreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
