'use client';

import React, { useEffect, useState } from 'react';
import { msg, useMessages } from 'gt-next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  type AiWorldApiConfig,
} from '@/lib/aiWorldModeStorage';

const LABELS = {
  title: msg('AI world simulation'),
  description: msg(
    'Add your own OpenAI-compatible API key. Requests go through this app’s server proxy so your browser is not blocked by CORS. The key is sent only for each request and is not stored on the server.',
  ),
  baseUrl: msg('API base URL'),
  model: msg('Model'),
  apiKey: msg('API key'),
  save: msg('Save & enable'),
  cancel: msg('Cancel'),
  clear: msg('Clear key & disable'),
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig: AiWorldApiConfig | null;
  onSave: (config: AiWorldApiConfig) => void;
  onClear: () => void;
};

export function AiWorldModeDialog({
  open,
  onOpenChange,
  initialConfig,
  onSave,
  onClear,
}: Props) {
  const m = useMessages();
  const [baseUrl, setBaseUrl] = useState(DEFAULT_AI_BASE_URL);
  const [model, setModel] = useState(DEFAULT_AI_MODEL);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (!open) return;
    setBaseUrl(initialConfig?.baseUrl || DEFAULT_AI_BASE_URL);
    setModel(initialConfig?.model || DEFAULT_AI_MODEL);
    setApiKey(initialConfig?.apiKey || '');
  }, [open, initialConfig]);

  const handleSave = () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return;
    onSave({
      baseUrl: baseUrl.trim() || DEFAULT_AI_BASE_URL,
      model: model.trim() || DEFAULT_AI_MODEL,
      apiKey: trimmedKey,
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    onClear();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{m(LABELS.title)}</DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed">
            {m(LABELS.description)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ai-base-url">{m(LABELS.baseUrl)}</Label>
            <Input
              id="ai-base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={DEFAULT_AI_BASE_URL}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-model">{m(LABELS.model)}</Label>
            <Input
              id="ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={DEFAULT_AI_MODEL}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-key">{m(LABELS.apiKey)}</Label>
            <Input
              id="ai-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={handleSave} disabled={!apiKey.trim()}>
            {m(LABELS.save)}
          </Button>
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {m(LABELS.cancel)}
            </Button>
            <Button variant="ghost" className="flex-1 text-destructive" onClick={handleClear}>
              {m(LABELS.clear)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
