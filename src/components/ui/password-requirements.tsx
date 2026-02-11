'use client';

import { Check, X } from 'lucide-react';

interface RuleResult {
  key: string;
  label: string;
  passed: boolean;
}

interface PasswordRequirementsProps {
  password: string;
  results: RuleResult[];
}

export function PasswordRequirements({ password, results }: PasswordRequirementsProps) {
  if (!password) {
    return (
      <p className="mt-2 text-xs text-[#94a3b8]">
        Must include uppercase, lowercase, number, and special character
      </p>
    );
  }

  return (
    <ul className="mt-2 space-y-1">
      {results.map((rule) => (
        <li key={rule.key} className="flex items-center gap-1.5 text-xs">
          {rule.passed ? (
            <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
          ) : (
            <X className="h-3 w-3 text-red-400 flex-shrink-0" />
          )}
          <span className={rule.passed ? 'text-green-500' : 'text-red-400'}>
            {rule.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
