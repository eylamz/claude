'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  SegmentedControls,
  Toaster,
} from '@/components/ui';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioButton, RadioButtonGroup } from '@/components/ui/radio-button';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ILocalized {
  en: string;
  he: string;
}

interface QuizQuestion {
  id: string;
  question: ILocalized;
  options: ILocalized[];
  correctOptionIndex: number;
  explanation?: ILocalized;
  order: number;
}

const defaultQuestion = (order: number): QuizQuestion => ({
  id: `q-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  question: { en: '', he: '' },
  options: [{ en: '', he: '' }, { en: '', he: '' }],
  correctOptionIndex: 0,
  order,
});

export default function AdminGuideQuizPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params.id as string) || '';
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<'en' | 'he'>('en');
  const [guideId, setGuideId] = useState<string | null>(null);
  const [guideSlug, setGuideSlug] = useState<string>(id);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [passingScore, setPassingScore] = useState(70);
  const [xpReward, setXpReward] = useState(100);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/guides/${encodeURIComponent(id)}/quiz`);
        if (!res.ok) {
          if (res.status === 403 || res.status === 401) {
            router.push('/');
            return;
          }
          setError('Failed to load quiz');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setGuideId(data.guideId || null);
        setGuideSlug(data.guideSlug || id);
        if (data.quiz) {
          const qs = (data.quiz.questions || []).map((q: any, i: number) => ({
            id: q.id || `q-${i}`,
            question: q.question || { en: '', he: '' },
            options: Array.isArray(q.options) ? q.options : [{ en: '', he: '' }, { en: '', he: '' }],
            correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
            explanation: q.explanation || undefined,
            order: typeof q.order === 'number' ? q.order : i,
          }));
          setQuestions(qs.length ? qs : [defaultQuestion(0)]);
          setPassingScore(data.quiz.passingScore ?? 70);
          setXpReward(data.quiz.xpReward ?? 100);
          setIsActive(data.quiz.isActive ?? true);
        } else {
          setQuestions([defaultQuestion(0)]);
        }
      } catch {
        setError('Failed to load quiz');
      }
      setLoading(false);
    };
    fetchData();
  }, [id, router]);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, defaultQuestion(prev.length)]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((q, i) => ({ ...q, order: i }));
    });
  };

  const setQuestion = (index: number, upd: Partial<QuizQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...upd } : q))
    );
  };

  const setQuestionField = (qIndex: number, field: keyof QuizQuestion, value: any) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, [field]: value } : q))
    );
  };

  const setOptionCount = (qIndex: number, count: number) => {
    const c = Math.min(5, Math.max(2, count));
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const opts = [...(q.options || [])];
        while (opts.length < c) opts.push({ en: '', he: '' });
        return { ...q, options: opts.slice(0, c), correctOptionIndex: Math.min(q.correctOptionIndex, c - 1) };
      })
    );
  };

  const handleSave = async () => {
    const payload = {
      guideId: guideId || undefined,
      guideSlug: guideSlug || id,
      questions: questions.map((q, i) => ({
        ...q,
        order: i,
        options: (q.options || []).slice(0, 5),
      })),
      passingScore,
      xpReward,
      isActive,
    };
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/guides/${encodeURIComponent(id)}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Error', description: err.error || 'Failed to save quiz', variant: 'destructive' });
        setSaving(false);
        return;
      }
      toast({ title: 'Saved', description: 'Quiz saved successfully', variant: 'success' });
      const data = await res.json();
      if (data.quiz?.id) setGuideId(data.quiz.guideId);
    } catch {
      toast({ title: 'Error', description: 'Failed to save quiz', variant: 'destructive' });
    }
    setSaving(false);
  };

  const locale = (params.locale as string) || 'en';

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <p className="text-text-secondary dark:text-text-secondary-dark">Loading quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-red-500">{error}</p>
        <Button variant="gray" className="mt-4" onClick={() => router.back()}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Toaster />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="gray" asChild>
            <Link href={`/${locale}/admin/guides/${id}/edit`} className="inline-flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back to guide edit
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-text dark:text-text-dark">Guide Quiz</h1>
        </div>
        <Button onClick={handleSave} disabled={saving} variant="green">
          {saving ? 'Saving...' : 'Save Quiz'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Passing score (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value) || 70)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">XP reward</label>
              <Input
                type="number"
                min={0}
                value={xpReward}
                onChange={(e) => setXpReward(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} variant="orange" />
            <span className="text-sm font-medium">Active (visible to users)</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text dark:text-text-dark">Questions</h2>
        <Button type="button" variant="blue" onClick={addQuestion} className="inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add question
        </Button>
      </div>

      {questions.map((q, qIndex) => (
        <Card key={q.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Question {qIndex + 1}</CardTitle>
            <Button
              type="button"
              variant="red"
              size="sm"
              onClick={() => removeQuestion(qIndex)}
              disabled={questions.length <= 1}
              className="inline-flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <SegmentedControls
              options={[
                { value: 'en', label: 'EN', variant: 'orange' },
                { value: 'he', label: 'HE', variant: 'orange' },
              ]}
              value={lang}
              onValueChange={(v) => setLang(v as 'en' | 'he')}
            />
            <div>
              <label className="block text-sm font-medium mb-1">Question text</label>
              <Input
                value={q.question[lang]}
                onChange={(e) =>
                  setQuestionField(qIndex, 'question', { ...q.question, [lang]: e.target.value })
                }
                placeholder={lang === 'en' ? 'Question text' : 'טקסט השאלה'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Options (2–5)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {[2, 3, 4, 5].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={q.options.length === n ? 'primary' : 'gray'}
                    size="sm"
                    onClick={() => setOptionCount(qIndex, n)}
                  >
                    {n} options
                  </Button>
                ))}
              </div>
              {q.options.map((opt, oIndex) => (
                <div key={oIndex} className="flex items-center gap-6 mb-2">
                  <RadioButton
                    name={`correct-${qIndex}`}
                    value={String(oIndex)}
                    checked={q.correctOptionIndex === oIndex}
                    onChange={() => setQuestionField(qIndex, 'correctOptionIndex', oIndex)}
                  />
                  <Input
                    className="flex-1"
                    value={opt[lang]}
                    onChange={(e) => {
                      const opts = [...q.options];
                      opts[oIndex] = { ...opts[oIndex], [lang]: e.target.value };
                      setQuestionField(qIndex, 'options', opts);
                    }}
                    placeholder={lang === 'en' ? `Option ${oIndex + 1}` : `אפשרות ${oIndex + 1}`}
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Explanation (optional)</label>
              <Textarea
                value={q.explanation?.[lang] ?? ''}
                onChange={(e) =>
                  setQuestion(qIndex, {
                    explanation: { ...(q.explanation || { en: '', he: '' }), [lang]: e.target.value },
                  })
                }
                placeholder={lang === 'en' ? 'Optional explanation' : 'הסבר אופציונלי'}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} variant="green">
          {saving ? 'Saving...' : 'Save Quiz'}
        </Button>
      </div>
    </div>
  );
}
