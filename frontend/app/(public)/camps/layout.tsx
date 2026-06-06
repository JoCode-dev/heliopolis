import { metadata as campsMetadata } from "./metadata";

export const metadata = campsMetadata;

export default function CampsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
