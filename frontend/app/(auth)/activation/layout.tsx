import { metadata as activationMetadata } from "./metadata";

export const metadata = activationMetadata;

export default function ActivationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
