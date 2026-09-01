"use client";

import AppShell from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { computeRiskScore, type RiskFactor } from "@/lib/bank-products";
import { useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
  FileText,
  Upload,
  ArrowRight,
  Scale,
  BadgeCheck,
  TriangleAlert,
} from "lucide-react";

function RiskGauge({ score }: { score: number }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const angle = -135 + (clampedScore / 100) * 270;
  const color = clampedScore >= 70 ? "#34C759" : clampedScore >= 45 ? "#FF9500" : "#FF3B30";

  return (
    <div className="relative w-44 h-28 mx-auto">
      <svg viewBox="0 0 180 110" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 20 100 A 70 70 0 1 1 160 100"
          fill="none"
          stroke="#E5E5EA"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Colored arc */}
        <path
          d="M 20 100 A 70 70 0 1 1 160 100"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${(clampedScore / 100) * 220} 220`}
        />
        {/* Zone labels */}
        <text x="14" y="114" fontSize="9" fill="#FF3B30" textAnchor="middle">Риск</text>
        <text x="90" y="18" fontSize="9" fill="#FF9500" textAnchor="middle">Внимание</text>
        <text x="166" y="114" fontSize="9" fill="#34C759" textAnchor="middle">Норма</text>
        {/* Score */}
        <text x="90" y="88" fontSize="26" fontWeight="bold" fill={color} textAnchor="middle">{clampedScore}</text>
        <text x="90" y="102" fontSize="9" fill="#8E8E93" textAnchor="middle">из 100</text>
      </svg>
    </div>
  );
}

function FactorCard({ factor }: { factor: RiskFactor }) {
  const isPositive = factor.points > 0;
  const borderColor = factor.severity === "high" ? "#FF3B30"
    : factor.severity === "medium" ? "#FF9500"
    : "#34C759";
  const bgColor = factor.severity === "high" ? "#FF3B30"
    : factor.severity === "medium" ? "#FF9500"
    : "#34C759";

  return (
    <div
      className="p-3.5 rounded-xl border"
      style={{ borderColor: `${borderColor}20`, backgroundColor: `${bgColor}06` }}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {isPositive
            ? <CheckCircle2 className="w-4 h-4" style={{ color: "#34C759" }} />
            : factor.severity === "high"
            ? <XCircle className="w-4 h-4" style={{ color: "#FF3B30" }} />
            : <AlertTriangle className="w-4 h-4" style={{ color: "#FF9500" }} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-[#303030]">{factor.title}</p>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${bgColor}15`, color: bgColor }}
            >
              {isPositive ? `+${factor.points}` : factor.points}
            </span>
          </div>
          <p className="text-xs text-[#8E8E93] leading-relaxed mb-1.5">{factor.description}</p>
          <div className="flex items-start gap-1.5">
            <ArrowRight className="w-3 h-3 text-[#3629B7] shrink-0 mt-0.5" />
            <p className="text-xs text-[#3629B7]">{factor.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const INFO_BLOCKS = [
  {
    icon: "📋",
    title: "Что такое 115-ФЗ",
    text: "Федеральный закон О противодействии легализации (отмыванию) доходов обязывает банки контролировать подозрительные операции. При нарушении банк может заблокировать счёт или запросить документы.",
  },
  {
    icon: "⚠️",
    title: "Что привлекает внимание банка",
    items: [
      "Снятие наличных более 50% от поступлений",
      "Переводы между физлицами на сумму >600 000 ₽/мес",
      "Нерегулярные крупные поступления без объяснений",
      "Частые P2P переводы похожие на предпринимательство",
      "Операции с юрисдикциями из чёрного списка ЦБ",
    ],
  },
  {
    icon: "✅",
    title: "Как защитить себя",
    items: [
      "Сохраняйте документы к каждой крупной операции",
      "Оформите ИП если регулярно получаете доход от услуг",
      "Указывайте назначение платежа в переводах",
      "Не дробите крупные суммы на маленькие для маскировки",
      "Отвечайте на запросы банка оперативно и с документами",
    ],
  },
];

const INSTRUCTION_STEPS = [
  {
    step: "01",
    title: "Банк прислал запрос на документы",
    text: "Не игнорируйте! У вас обычно 7–30 дней на ответ. Подготовьте: договоры, акты, справки о доходах, счета-фактуры. Подайте в офисе или через онлайн-банк.",
  },
  {
    step: "02",
    title: "Карта заблокирована по 115-ФЗ",
    text: "Обратитесь в банк для выяснения причины. Предоставьте пакет документов. Если отказали — можно подать жалобу в ЦБ через интернет-приёмную или оспорить через суд.",
  },
  {
    step: "03",
    title: "Вы стали жертвой мошенников",
    text: "Немедленно позвоните в банк (горячая линия на карте). Подайте заявление на опротестование операции в офисе. Сообщите в полицию (102 или онлайн на МВД.рф). Срок претензии — 30 дней.",
  },
];

export default function RiskCompliancePage() {
  const { userData } = useAuth();
  const profile = userData?.profile;
  const transactions = userData?.transactions || [];

  const report = useMemo(() => {
    if (!profile) return null;
    return computeRiskScore(profile, transactions);
  }, [profile, transactions]);

  const levelConfig = report ? {
    safe: {
      label: "Норма",
      icon: ShieldCheck,
      color: "#34C759",
      bg: "#34C75910",
      border: "#34C75930",
      desc: "Ваш финансовый профиль выглядит надёжно",
    },
    attention: {
      label: "Внимание",
      icon: ShieldAlert,
      color: "#FF9500",
      bg: "#FF950010",
      border: "#FF950030",
      desc: "Есть моменты, которые стоит проверить",
    },
    risk: {
      label: "Риск",
      icon: ShieldX,
      color: "#FF3B30",
      bg: "#FF3B3010",
      border: "#FF3B3030",
      desc: "Обнаружены факторы повышенного риска",
    },
  }[report.level] : null;

  const LevelIcon = levelConfig?.icon ?? ShieldCheck;

  return (
    <AppShell>
      <div className="space-y-5 max-w-[900px]">

        {/* Hero */}
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#3629B7] to-[#2a1f8f] text-white">
          <CardContent className="p-5 md:p-6 relative">
            <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/5 blur-[80px]" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="w-4 h-4 text-yellow-300" />
                <span className="text-xs font-medium text-white/60">Анализ финансового риска</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-1">
                Риск-скоринг и комплаенс
              </h2>
              <p className="text-sm text-white/60 max-w-lg">
                Проверяем ваши операции по признакам 115-ФЗ. Узнайте заранее, что может вызвать вопросы у банка — и что сделать, чтобы избежать блокировки.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* No data */}
        {transactions.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Upload className="w-12 h-12 text-[#8E8E93] mx-auto mb-3" />
              <p className="text-base font-semibold text-[#303030] mb-1">Нет данных для анализа</p>
              <p className="text-sm text-[#8E8E93] mb-4 max-w-sm mx-auto">
                Загрузите банковскую выписку, чтобы получить персональный риск-скоринг по вашим операциям.
              </p>
              <Link href="/upload">
                <Button className="bg-[#3629B7] hover:bg-[#2a1f8f] text-white rounded-xl">
                  <Upload className="w-4 h-4 mr-2" />
                  Загрузить выписку
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {report && levelConfig && (
          <>
            {/* Score card */}
            <Card className="border" style={{ borderColor: levelConfig.border, backgroundColor: levelConfig.bg }}>
              <CardContent className="p-5 md:p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="shrink-0">
                    <RiskGauge score={report.score} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                      <LevelIcon className="w-5 h-5" style={{ color: levelConfig.color }} />
                      <span className="font-bold text-lg" style={{ color: levelConfig.color }}>
                        {levelConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-[#303030] font-medium mb-1">{levelConfig.desc}</p>
                    <p className="text-sm text-[#8E8E93] mb-4">{report.summary}</p>

                    {/* Actions */}
                    <div className="space-y-2">
                      {report.actions.map((action, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5" style={{ color: levelConfig.color }} />
                          <p className="text-sm text-[#303030]">{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Factors */}
            {report.factors.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-[#303030]">Факторы оценки</h3>
                <div className="space-y-2.5">
                  {report.factors.map((factor) => (
                    <FactorCard key={factor.id} factor={factor} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* 115-FZ Info blocks */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-[#303030]">Что важно знать о 115-ФЗ</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {INFO_BLOCKS.map((block) => (
              <Card key={block.title} className="border border-[#E5E5EA]">
                <CardContent className="p-4">
                  <div className="text-2xl mb-2">{block.icon}</div>
                  <p className="text-sm font-semibold text-[#303030] mb-2">{block.title}</p>
                  {block.text && <p className="text-xs text-[#8E8E93] leading-relaxed">{block.text}</p>}
                  {block.items && (
                    <ul className="space-y-1.5">
                      {block.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#3629B7] mt-1.5 shrink-0" />
                          <span className="text-xs text-[#8E8E93] leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Action instructions */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-[#303030]">Инструкции: что делать в сложных ситуациях</h3>
          <div className="space-y-3">
            {INSTRUCTION_STEPS.map((step) => (
              <Card key={step.step} className="border border-[#E5E5EA]">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#3629B7] flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-white">{step.step}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#303030] mb-1">{step.title}</p>
                      <p className="text-sm text-[#8E8E93] leading-relaxed">{step.text}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Legal notes */}
        <Card className="border border-[#E5E5EA] bg-[#F5F5F7]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-[#8E8E93] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#303030]">Полезные ссылки</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {[
                    { label: "ЦБ РФ — официальный сайт", url: "https://www.cbr.ru" },
                    { label: "Интернет-приёмная ЦБ", url: "https://www.cbr.ru/reception/" },
                    { label: "НБКИ — кредитная история", url: "https://www.nbki.ru" },
                    { label: "МВД — заявление онлайн", url: "https://mvd.ru" },
                  ].map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#3629B7] hover:underline flex items-center gap-1"
                    >
                      {link.label}
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-[#8E8E93] text-center pb-2">
          Анализ носит информационный характер и не является юридической консультацией. При серьёзных ситуациях обратитесь к юристу.
        </p>
      </div>
    </AppShell>
  );
}
