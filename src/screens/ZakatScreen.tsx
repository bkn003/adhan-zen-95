import React, { useMemo, useState } from 'react';
import { ArrowLeft, Copy, Printer, Info, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

interface ZakatScreenProps {
  onBack: () => void;
}

const num = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export const ZakatScreen: React.FC<ZakatScreenProps> = ({ onBack }) => {
  const { toast } = useToast();
  const [cash, setCash] = useState('');
  const [bank, setBank] = useState('');
  const [goldGrams, setGoldGrams] = useState('');
  const [silverGrams, setSilverGrams] = useState('');
  const [business, setBusiness] = useState('');
  const [liabilities, setLiabilities] = useState('');
  const [goldPrice, setGoldPrice] = useState('6500'); // per gram (INR default)
  const [silverPrice, setSilverPrice] = useState('85');
  const [currency, setCurrency] = useState('INR');
  const [nisabBasis, setNisabBasis] = useState<'gold' | 'silver'>('silver');

  const calc = useMemo(() => {
    const goldValue = num(goldGrams) * num(goldPrice);
    const silverValue = num(silverGrams) * num(silverPrice);
    const totalAssets =
      num(cash) + num(bank) + goldValue + silverValue + num(business);
    const zakatableWealth = Math.max(0, totalAssets - num(liabilities));
    const nisabThreshold =
      nisabBasis === 'gold' ? 87.48 * num(goldPrice) : 612.36 * num(silverPrice);
    const liable = zakatableWealth >= nisabThreshold && nisabThreshold > 0;
    const zakatDue = liable ? zakatableWealth * 0.025 : 0;
    return {
      goldValue,
      silverValue,
      totalAssets,
      zakatableWealth,
      nisabThreshold,
      liable,
      zakatDue,
    };
  }, [
    cash,
    bank,
    goldGrams,
    silverGrams,
    business,
    liabilities,
    goldPrice,
    silverPrice,
    nisabBasis,
  ]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(n);

  const summary = () =>
    [
      `Zakat Calculation (${new Date().toLocaleDateString()})`,
      `Currency: ${currency}`,
      `Nisab basis: ${nisabBasis}`,
      `Cash: ${fmt(num(cash))}`,
      `Bank: ${fmt(num(bank))}`,
      `Gold (${num(goldGrams)}g @ ${fmt(num(goldPrice))}): ${fmt(calc.goldValue)}`,
      `Silver (${num(silverGrams)}g @ ${fmt(num(silverPrice))}): ${fmt(calc.silverValue)}`,
      `Business assets: ${fmt(num(business))}`,
      `Liabilities: -${fmt(num(liabilities))}`,
      `Total assets: ${fmt(calc.totalAssets)}`,
      `Zakatable wealth: ${fmt(calc.zakatableWealth)}`,
      `Nisab threshold: ${fmt(calc.nisabThreshold)}`,
      `Liable: ${calc.liable ? 'Yes' : 'No'}`,
      `Zakat due (2.5%): ${fmt(calc.zakatDue)}`,
    ].join('\n');

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary());
    toast({ title: 'Copied', description: 'Zakat breakdown copied to clipboard.' });
  };

  const printPage = () => window.print();

  const Field = ({
    label,
    value,
    onChange,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <Input
        type="number"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-emerald-50/40 pb-28">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b px-4 py-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 rounded-xl">
            <Coins className="w-5 h-5 text-amber-700" />
          </div>
          <h1 className="text-lg font-bold text-gray-800">Zakat Calculator</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">Settings</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-10 rounded-xl border px-3 text-sm bg-white"
              >
                {['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'MYR', 'PKR', 'BDT'].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  )
                )}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Nisab Basis</label>
              <select
                value={nisabBasis}
                onChange={(e) => setNisabBasis(e.target.value as 'gold' | 'silver')}
                className="w-full h-10 rounded-xl border px-3 text-sm bg-white"
              >
                <option value="silver">Silver (612.36g)</option>
                <option value="gold">Gold (87.48g)</option>
              </select>
            </div>
            <Field
              label={`Gold price / gram (${currency})`}
              value={goldPrice}
              onChange={setGoldPrice}
            />
            <Field
              label={`Silver price / gram (${currency})`}
              value={silverPrice}
              onChange={setSilverPrice}
            />
          </div>
          <p className="text-[11px] text-gray-500 flex items-start gap-1">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            Update the metal prices to current market rates in your country for the
            most accurate Nisab.
          </p>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">Assets</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cash on hand" value={cash} onChange={setCash} placeholder="0" />
            <Field label="Bank balance" value={bank} onChange={setBank} placeholder="0" />
            <Field
              label="Gold owned (grams)"
              value={goldGrams}
              onChange={setGoldGrams}
              placeholder="0"
            />
            <Field
              label="Silver owned (grams)"
              value={silverGrams}
              onChange={setSilverGrams}
              placeholder="0"
            />
            <Field
              label="Business assets"
              value={business}
              onChange={setBusiness}
              placeholder="0"
            />
            <Field
              label="Liabilities / debts"
              value={liabilities}
              onChange={setLiabilities}
              placeholder="0"
            />
          </div>
        </Card>

        <Card className="p-4 space-y-2 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <h2 className="text-sm font-bold text-emerald-800">Breakdown</h2>
          <Row label="Gold value" value={fmt(calc.goldValue)} />
          <Row label="Silver value" value={fmt(calc.silverValue)} />
          <Row label="Total assets" value={fmt(calc.totalAssets)} />
          <Row label="Liabilities" value={`- ${fmt(num(liabilities))}`} />
          <Row label="Zakatable wealth" value={fmt(calc.zakatableWealth)} strong />
          <Row label="Nisab threshold" value={fmt(calc.nisabThreshold)} />
          <div
            className={`mt-3 rounded-2xl p-4 text-center ${
              calc.liable
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <p className="text-xs uppercase tracking-wide opacity-90">
              {calc.liable ? 'Zakat due (2.5%)' : 'Below Nisab — no zakat due'}
            </p>
            <p className="text-3xl font-extrabold mt-1">{fmt(calc.zakatDue)}</p>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 print:hidden">
          <Button onClick={copySummary} variant="outline" className="rounded-xl">
            <Copy className="w-4 h-4 mr-2" /> Copy
          </Button>
          <Button onClick={printPage} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
            <Printer className="w-4 h-4 mr-2" /> Export / Print
          </Button>
        </div>
      </div>
    </div>
  );
};

const Row = ({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) => (
  <div className="flex items-center justify-between text-sm py-1">
    <span className="text-gray-600">{label}</span>
    <span className={strong ? 'font-bold text-gray-900' : 'text-gray-800'}>{value}</span>
  </div>
);

export default ZakatScreen;
