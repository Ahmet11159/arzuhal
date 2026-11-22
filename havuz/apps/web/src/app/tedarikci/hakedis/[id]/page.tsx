import { SettlementDetailView } from '@/components/payout/settlement-detail';

export default function Page({ params }: { params: { id: string } }) {
  return <SettlementDetailView id={params.id} backHref="/tedarikci/hakedis" />;
}
