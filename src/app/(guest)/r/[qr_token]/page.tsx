import { GuestStart } from './guest-start';

export default async function GuestEntry({ params }: { params: Promise<{ qr_token: string }> }) {
  const { qr_token } = await params; // params είναι async σε Next 15+/16
  return <GuestStart qrToken={qr_token} />;
}