"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Flame, Trophy } from "lucide-react";

const actions = [
  { id: "profile", label: "Заполнить профиль" },
  { id: "transaction", label: "Добавить первую операцию" },
  { id: "goal", label: "Создать финансовую цель" },
];

export function FinancialProgress({ userId }: { userId?: string }) {
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!userId) return;
    void supabase.from("user_progress").select("points,streak_days,completed_actions").eq("user_id", userId).maybeSingle().then(({ data }) => {
      if (!data) return;
      setPoints(data.points ?? 0);
      setStreak(data.streak_days ?? 0);
      setCompleted(Array.isArray(data.completed_actions) ? data.completed_actions : []);
    });
  }, [supabase, userId]);

  const progress = Math.min(100, Math.round((completed.length / actions.length) * 100));
  const level = Math.floor(points / 100) + 1;

  if (!userId) return null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div className="flex flex-col gap-1"><CardTitle className="flex items-center gap-2 text-base"><Trophy className="text-primary" />Финансовый прогресс</CardTitle><p className="text-sm text-muted-foreground">Небольшие шаги помогают держать бюджет под контролем.</p></div>
        <Badge variant="secondary">Уровень {level}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm"><span>{completed.length} из {actions.length} шагов выполнено</span><span className="font-medium">{points} баллов</span></div>
        <Progress value={progress} aria-label={`Финансовый прогресс ${progress}%`} />
        <div className="grid gap-2 sm:grid-cols-3">
          {actions.map((action) => <div key={action.id} className="flex items-center gap-2 text-sm text-muted-foreground">{completed.includes(action.id) ? <CheckCircle2 className="text-primary" /> : <span className="size-4 rounded-full border" aria-hidden="true" />}{action.label}</div>)}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Flame className="text-orange-500" />Серия полезных действий: <strong className="text-foreground">{streak} дн.</strong></div>
      </CardContent>
    </Card>
  );
}
