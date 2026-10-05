import { useEffect, useMemo, useState } from "react";
import { Camera, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { describeMeal, readMealPhoto } from "@/lib/ai";
import { FOODS, getFood, scaleNutrients, searchFoods } from "@/lib/foods";
import { extractJson } from "@/lib/json";
import { useAppStore } from "@/lib/store";
import { MEAL_LABEL } from "@/lib/goals";
import type { MealType, Nutrients } from "@/lib/types";
import { todayKey } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";

type AiItem = { name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number };

export function FoodSheet({
  open,
  onOpenChange,
  defaultMeal = "lunch",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultMeal?: MealType;
}) {
  const [tab, setTab] = useState("search");
  const [q, setQ] = useState("");
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [grams, setGrams] = useState(100);
  const [picked, setPicked] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const addLogFromFood = useAppStore((s) => s.addLogFromFood);
  const addLog = useAppStore((s) => s.addLog);

  useEffect(() => {
    if (open) setMeal(defaultMeal);
  }, [open, defaultMeal]);

  const results = useMemo(() => searchFoods(q, 18), [q]);
  const food = picked ? getFood(picked) : undefined;
  const preview = food ? scaleNutrients(food.per100, grams) : null;

  function commitFood() {
    if (!picked) return;
    addLogFromFood(picked, grams, meal, todayKey(), "search");
    toast.success("已记入今日");
    onOpenChange(false);
    setPicked(null);
    setQ("");
  }

  async function runDescribe() {
    if (!prompt.trim()) return;
    setBusy(true);
    try {
      const res = await describeMeal({ data: { text: prompt } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      applyAi(res.text);
    } finally {
      setBusy(false);
    }
  }

  function applyAi(text: string) {
    const parsed = extractJson<{ title?: string; items: AiItem[]; note?: string }>(text);
    if (!parsed?.items?.length) {
      toast.error("没能解析这顿饭，试试写得更具体");
      return;
    }
    for (const it of parsed.items) {
      const match = searchFoods(it.name, 1)[0];
      const nutrients: Nutrients = {
        kcal: Math.round(it.kcal),
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat,
        fiber: 0,
        sodium: 0,
      };
      addLog({
        date: todayKey(),
        meal,
        foodId: match?.id ?? "custom",
        name: it.name,
        grams: it.grams,
        nutrients,
        source: "ai",
      });
    }
    toast.success(parsed.title ? `已记录：${parsed.title}` : "已记录");
    if (parsed.note) toast.message(parsed.note);
    onOpenChange(false);
    setPrompt("");
  }

  async function onPhoto(file: File) {
    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      const base64 = dataUrl.split(",")[1] ?? "";
      const mime = file.type.includes("png") ? "image/png" : "image/jpeg";
      const res = await readMealPhoto({ data: { imageBase64: base64, mime } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      applyAi(res.text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>记一笔</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-5 pb-8">
          <div className="flex gap-2">
            {(Object.keys(MEAL_LABEL) as MealType[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMeal(m)}
                className={`h-9 rounded-full px-3 text-sm ${meal === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {MEAL_LABEL[m]}
              </button>
            ))}
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="search" className="flex-1">
                <Search className="mr-1 size-3.5" />
                搜索
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex-1">
                <Sparkles className="mr-1 size-3.5" />
                描述
              </TabsTrigger>
              <TabsTrigger value="photo" className="flex-1">
                <Camera className="mr-1 size-3.5" />
                照片
              </TabsTrigger>
            </TabsList>
            <TabsContent value="search" className="flex flex-col gap-3">
              <Input
                placeholder="搜：燕麦、宫保鸡丁、奶茶…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPicked(null);
                }}
              />
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {(q ? results : FOODS.slice(0, 12)).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setPicked(f.id);
                      setGrams(f.defaultGrams);
                    }}
                    className={`flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm ${picked === f.id ? "bg-accent" : "hover:bg-muted"}`}
                  >
                    <span>{f.name}</span>
                    <span className="tabular-nums text-muted-foreground">{f.per100.kcal} kcal/100g</span>
                  </button>
                ))}
              </div>
              {food && preview ? (
                <div className="rounded-lg bg-muted p-4">
                  <Label>份量 {grams} g</Label>
                  <input
                    type="range"
                    min={20}
                    max={400}
                    value={grams}
                    onChange={(e) => setGrams(Number(e.target.value))}
                    className="mt-2 w-full accent-primary"
                  />
                  <p className="mt-2 text-sm tabular-nums text-muted-foreground">
                    {preview.kcal} kcal · 蛋白 {preview.protein} g · 碳 {preview.carbs} g · 脂 {preview.fat} g
                  </p>
                  <Button className="mt-3 w-full" onClick={commitFood}>
                    记入{MEAL_LABEL[meal]}
                  </Button>
                </div>
              ) : null}
            </TabsContent>
            <TabsContent value="ai" className="flex flex-col gap-3">
              <Textarea
                placeholder="例如：午饭吃了番茄炒蛋一盘、半碗糙米饭、一份西兰花"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <Button onClick={runDescribe} disabled={busy || !prompt.trim()}>
                {busy ? "估算中…" : "估算并记录"}
              </Button>
              <p className="text-xs text-muted-foreground">由模型估算，仅供参考，可在记录里删除不准的项。</p>
            </TabsContent>
            <TabsContent value="photo" className="flex flex-col gap-3">
              <Label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                <Camera className="mb-2 size-6" />
                {busy ? "识别中…" : "上传餐盘照片"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onPhoto(file);
                  }}
                />
              </Label>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 960;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}
