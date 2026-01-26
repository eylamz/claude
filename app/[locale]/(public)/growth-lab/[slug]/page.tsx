'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton, Toaster } from '@/components/ui';
import { FormFieldRenderer } from '@/components/forms/FormFieldRenderer';
import { useToast } from '@/hooks/use-toast';
import { generateFormMetadata } from '@/lib/seo/metadata-generators';

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'select' | 'date' | 'number' | 'link' | 'image' | 'image-selection' | 'israel-cities';
  label: { en: string; he: string };
  required: boolean;
  placeholder?: { en: string; he: string };
  options?: Array<{ value: string; label: { en: string; he: string } }>;
  hasOtherOption?: boolean;
  otherInputType?: 'input' | 'textarea';
  images?: Array<{ url: string; alt?: { en: string; he: string } }>;
  min?: number;
  max?: number;
}

interface Form {
  id: string;
  slug: string;
  title: {
    en: string;
    he: string;
  };
  description: {
    en: string;
    he: string;
  };
  fields: FormField[];
  submissionsCount: number;
}

export default function FormFillPage() {
  const locale = useLocale() as 'en' | 'he';
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    const checkSubmission = async () => {
      // Check localStorage first
      const submittedKey = `form_submission_${slug}`;
      if (localStorage.getItem(submittedKey)) {
        setAlreadySubmitted(true);
        router.push(`/${locale}/growth-lab/${slug}/fulfilled`);
        return;
      }

      // Check with API
      try {
        const response = await fetch(`/api/forms/${slug}/check-submission`);
        if (response.ok) {
          const data = await response.json();
          if (data.submitted) {
            setAlreadySubmitted(true);
            localStorage.setItem(submittedKey, 'true');
            router.push(`/${locale}/growth-lab/${slug}/fulfilled`);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking submission:', error);
      }

      // Fetch form
      try {
        const response = await fetch(`/api/forms/${slug}`);
        if (!response.ok) {
          if (response.status === 404) {
            router.push(`/${locale}/growth-lab`);
            return;
          }
          throw new Error('Failed to fetch form');
        }

        const data = await response.json();
        setForm(data.form);

        // Initialize form data
        const initialData: Record<string, any> = {};
        data.form.fields.forEach((field: FormField) => {
          if (field.type === 'checkbox') {
            initialData[field.id] = [];
          } else {
            initialData[field.id] = '';
          }
        });
        setFormData(initialData);
      } catch (error) {
        console.error('Error fetching form:', error);
        toast({
          title: 'Error',
          description: 'Failed to load form',
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      checkSubmission();
    }
  }, [slug, locale, router, toast]);

  // Set SEO meta tags dynamically
  useEffect(() => {
    if (!form) {
      document.title = locale === 'en' ? 'Form - ENBOSS' : 'טופס - אנבוס';
      return;
    }

    const metaTitle = form.metaTitle?.[locale] || form.title[locale] || form.title.en || 'Form';
    const metaDescription = form.metaDescription?.[locale] || form.description[locale] || form.description.en || '';
    const metaKeywords = form.metaKeywords?.[locale] || '';

    document.title = metaTitle;

    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const setLinkTag = (rel: string, href: string, hreflang?: string) => {
      const selector = hreflang
        ? `link[rel="${rel}"][hreflang="${hreflang}"]`
        : `link[rel="${rel}"]`;
      let link = document.querySelector(selector);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        if (hreflang) link.setAttribute('hreflang', hreflang);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
    const canonicalUrl = `${siteUrl}/${locale}/growth-lab/${slug}`;
    const alternateEnUrl = `${siteUrl}/en/growth-lab/${slug}`;
    const alternateHeUrl = `${siteUrl}/he/growth-lab/${slug}`;

    setMetaTag('description', metaDescription);
    if (metaKeywords) {
      setMetaTag('keywords', metaKeywords);
    }

    if (canonicalUrl) {
      setLinkTag('canonical', canonicalUrl);
      setLinkTag('alternate', alternateEnUrl, 'en');
      setLinkTag('alternate', alternateHeUrl, 'he');
      setLinkTag('alternate', alternateEnUrl, 'x-default');
    }

    setMetaTag('og:title', metaTitle, true);
    setMetaTag('og:description', metaDescription, true);
    setMetaTag('og:type', 'website', true);
    setMetaTag('og:locale', locale === 'he' ? 'he_IL' : 'en_US', true);
    if (locale === 'en') {
      setMetaTag('og:locale:alternate', 'he_IL', true);
    } else {
      setMetaTag('og:locale:alternate', 'en_US', true);
    }
    if (canonicalUrl) {
      setMetaTag('og:url', canonicalUrl, true);
    }
  }, [form, locale, slug]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form) return false;

    form.fields.forEach((field) => {
      if (field.required) {
        const value = formData[field.id];
        if (
          value === undefined ||
          value === null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === 'object' && value.value === 'other' && !value.other)
        ) {
          const fieldLabel = field.label[locale] || field.label.en || field.id;
          newErrors[field.id] = `${fieldLabel} is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form) return;

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'error',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Prepare answers
      const answers = form.fields.map((field) => {
        const value = formData[field.id];
        return {
          fieldId: field.id,
          answer: value,
        };
      });

      const response = await fetch(`/api/forms/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409 && errorData.submitted) {
          // Already submitted
          const submittedKey = `form_submission_${slug}`;
          localStorage.setItem(submittedKey, 'true');
          router.push(`/${locale}/growth-lab/${slug}/fulfilled`);
          return;
        }
        throw new Error(errorData.error || 'Failed to submit form');
      }

      // Mark as submitted in localStorage
      const submittedKey = `form_submission_${slug}`;
      localStorage.setItem(submittedKey, 'true');

      // Redirect to success page
      router.push(`/${locale}/growth-lab/${slug}/success`);
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit form',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value,
    }));
    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  if (loading || alreadySubmitted) {
    return (
      <div className="pt-16 space-y-6 max-w-4xl mx-auto px-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="pt-16 space-y-6 max-w-4xl mx-auto px-4">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-text-secondary dark:text-text-secondary-dark">
              {locale === 'en' ? 'Form not found' : 'טופס לא נמצא'}
            </p>
            <Button
              variant="blue"
              onClick={() => router.push(`/${locale}/growth-lab`)}
              className="mt-4"
            >
              {locale === 'en' ? 'Back to Forms' : 'חזרה לטפסים'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="pt-16 space-y-6 max-w-4xl mx-auto px-4">
      <Toaster />
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-text dark:text-text-dark">
          {form.title[locale] || form.title.en}
        </h1>
        <p className="text-lg text-text-secondary dark:text-text-secondary-dark">
          {form.description[locale] || form.description.en}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-card dark:bg-card-dark">
          <CardContent className="p-6 space-y-6">
            {form.fields
              .sort((a, b) => a.order - b.order)
              .map((field, index) => (
                <div key={field.id}>
                  <FormFieldRenderer
                    field={field}
                    value={formData[field.id]}
                    onChange={(value) => handleFieldChange(field.id, value)}
                    error={errors[field.id]}
                    locale={locale}
                    questionNumber={index + 1}
                  />
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-center pb-16">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
            className="min-w-[200px]"
          >
            {submitting
              ? locale === 'en'
                ? 'Submitting...'
                : 'שולח...'
              : locale === 'en'
              ? 'Submit Form'
              : 'שלח טופס'}
          </Button>
        </div>
      </form>
    </div>
  );
}
