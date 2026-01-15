'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button, Input, Textarea } from '@/components/ui';
import { sendContactFormEmailJS } from '@/lib/email/emailjs-service';
import { useToast } from '@/hooks/use-toast';

interface FormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  description: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  description?: string;
}

export default function ContactPage() {
  const locale = useLocale();
  const t = useTranslations('contact');
  const { toast } = useToast();
  const isRTL = locale === 'he';

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    description: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('form.nameRequired');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('form.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('form.emailInvalid');
    }

    if (formData.phone.trim() && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = t('form.phoneInvalid');
    }

    if (!formData.subject.trim()) {
      newErrors.subject = t('form.subjectRequired');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('form.descriptionRequired');
    } else if (formData.description.trim().length < 10) {
      newErrors.description = t('form.descriptionMinLength');
    } else if (formData.description.trim().length > 250) {
      newErrors.description = t('form.descriptionMaxLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validate
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await sendContactFormEmailJS({
        userName: formData.name.trim(),
        userEmail: formData.email.trim(),
        userPhone: formData.phone.trim() || undefined,
        subject: formData.subject.trim(),
        message: formData.description.trim(),
        replyTo: formData.email.trim(),
      });

      // Show success toast
      toast({
        title: t('success.title'),
        description: t('success.description'),
        variant: 'success',
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        description: '',
      });
    } catch (error) {
      console.error('Failed to send contact form:', error);
      
      // Show error toast
      toast({
        title: t('error.title'),
        description: t('error.description'),
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-16 bg-background dark:bg-background-dark">
      <div className="w-full max-w-[500px] animate-fade-in">
        {/* Card */}
        <div className="rounded-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="text-gray dark:text-gray-dark">
              {t('subtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Name Field */}
            <Input
              id="name"
              name="name"
              type="text"
              label={t('form.name')}
              value={formData.name}
              onChange={handleChange}
              placeholder={t('form.name')}
              disabled={isSubmitting}
              autoComplete="name"
              error={errors.name}
              required
            />

            {/* Email Field */}
            <Input
              id="email"
              name="email"
              type="email"
              label={t('form.email')}
              value={formData.email}
              onChange={handleChange}
              placeholder={t('form.email')}
              disabled={isSubmitting}
              autoComplete="email"
              error={errors.email}
              required
            />

            {/* Phone Field */}
            <Input
              id="phone"
              name="phone"
              type="tel"
              label={t('form.phone')}
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('form.phone')}
              disabled={isSubmitting}
              autoComplete="tel"
              error={errors.phone}
            />

            {/* Subject Field */}
            <Input
              id="subject"
              name="subject"
              type="text"
              label={t('form.subject')}
              value={formData.subject}
              onChange={handleChange}
              placeholder={t('form.subject')}
              disabled={isSubmitting}
              error={errors.subject}
              required
            />

            {/* Description Field */}
            <div className="w-full">
              <Textarea
                id="description"
                name="description"
                label={t('form.description')}
                value={formData.description}
                onChange={handleChange}
                placeholder={t('form.description')}
                disabled={isSubmitting}
                error={errors.description}
                required
                rows={6}
                maxLength={250}
              />
              <div className="flex items-center justify-end mt-1 text-xs">
                <span className="text-gray dark:text-text-gray-dark">
                  {t('form.charactersCount', { count: formData.description.length })}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full max-w-[270px]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('form.submitting')}
                </span>
              ) : (
                t('form.submit')
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

