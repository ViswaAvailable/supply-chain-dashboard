import { useMemo } from 'react';
import { PASSWORD_RULES } from '@/lib/validation/schemas';

export function usePasswordValidation(password: string) {
  const results = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ key: rule.key, label: rule.label, passed: rule.test(password) })),
    [password]
  );

  const isValid = useMemo(() => results.every((r) => r.passed), [results]);

  return { results, isValid };
}
