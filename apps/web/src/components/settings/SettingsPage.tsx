import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useSettings, useUpdateSettings, useTestAI } from '@/hooks/use-api';
import { TagInput } from './TagInput';

type AIProvider = 'claude' | 'openai' | 'glm5';

export function SettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const testAI = useTestAI();

  const [aiProvider, setAiProvider] = useState<AIProvider>('claude');
  const [apiKey, setApiKey] = useState('');
  const [modelOverride, setModelOverride] = useState('');
  const [includeKeywords, setIncludeKeywords] = useState<string[]>([]);
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([]);
  const [blockedCompanies, setBlockedCompanies] = useState<string[]>([]);
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [dailyCap, setDailyCap] = useState(50);
  const [confirmAutoSubmit, setConfirmAutoSubmit] = useState(false);

  useEffect(() => {
    if (data) {
      setAiProvider((data.aiProvider as AIProvider) || 'claude');
      setModelOverride(data.aiModel ?? '');
      setIncludeKeywords(data.includeKeywords ?? []);
      setExcludeKeywords(data.excludeKeywords ?? []);
      setBlockedCompanies(data.blockedCompanies ?? []);
      setAutoSubmit(data.autoSubmit ?? false);
      setDailyCap(data.dailyApplyCap ?? 50);
    }
  }, [data]);

  function handleAutoSubmitChange(checked: boolean) {
    if (checked && !autoSubmit) {
      setConfirmAutoSubmit(true);
    } else {
      setAutoSubmit(checked);
    }
  }

  function handleConfirmAutoSubmit() {
    setAutoSubmit(true);
    setConfirmAutoSubmit(false);
  }

  function handleTestConnection() {
    if (!apiKey) {
      toast.error('Please enter an API key first');
      return;
    }
    testAI.mutate(
      {
        provider: aiProvider,
        apiKey,
        model: modelOverride || undefined,
      },
      {
        onSuccess: (result) => {
          if (result.ok) {
            toast.success('Connection successful');
          } else {
            toast.error(`Connection failed: ${result.error ?? 'Unknown error'}`);
          }
        },
        onError: (err) => toast.error(`Connection failed: ${err.message}`),
      },
    );
  }

  function handleSave() {
    updateSettings.mutate(
      {
        aiProvider,
        ...(apiKey ? { aiApiKey: apiKey } : {}),
        aiModel: modelOverride || null,
        includeKeywords,
        excludeKeywords,
        blockedCompanies,
        autoSubmit,
        dailyApplyCap: dailyCap,
      },
      {
        onSuccess: () => toast.success('Settings saved'),
        onError: (err) => toast.error(`Failed to save: ${err.message}`),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* AI Provider Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">AI Provider</h2>
        <div className="space-y-2">
          <Label>Provider</Label>
          <div className="flex gap-2">
            {(['claude', 'openai', 'glm5'] as const).map((provider) => (
              <Button
                key={provider}
                type="button"
                variant={aiProvider === provider ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAiProvider(provider)}
              >
                {provider}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="Enter your API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          {data?.aiApiKeyMasked && !apiKey && (
            <p className="text-sm text-muted-foreground">
              Current: {data.aiApiKeyMasked}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testAI.isPending}
          >
            {testAI.isPending ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="model-override">Model Override (optional)</Label>
          <Input
            id="model-override"
            placeholder="e.g. claude-sonnet-4-20250514"
            value={modelOverride}
            onChange={(e) => setModelOverride(e.target.value)}
          />
        </div>
      </section>

      {/* Job Filters Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Job Filters</h2>
        <div className="space-y-2">
          <Label>Include Keywords</Label>
          <TagInput
            tags={includeKeywords}
            onChange={setIncludeKeywords}
            placeholder="Add keyword (press Enter)"
          />
        </div>
        <div className="space-y-2">
          <Label>Exclude Keywords</Label>
          <TagInput
            tags={excludeKeywords}
            onChange={setExcludeKeywords}
            placeholder="Add keyword (press Enter)"
          />
        </div>
        <div className="space-y-2">
          <Label>Blocked Companies</Label>
          <TagInput
            tags={blockedCompanies}
            onChange={setBlockedCompanies}
            placeholder="Add company name (press Enter)"
          />
        </div>
      </section>

      {/* Safety Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Safety</h2>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Auto-Submit</Label>
            <p className="text-sm text-muted-foreground">
              Automatically submit applications for matching jobs
            </p>
          </div>
          <Switch checked={autoSubmit} onCheckedChange={handleAutoSubmitChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="daily-cap">Daily Apply Cap</Label>
          <Input
            id="daily-cap"
            type="number"
            min={1}
            max={500}
            value={dailyCap}
            onChange={(e) => setDailyCap(Number(e.target.value))}
            className="w-32"
          />
        </div>
      </section>

      {/* Save Button */}
      <div className="pt-4">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Auto-submit Confirmation Dialog */}
      <Dialog open={confirmAutoSubmit} onOpenChange={setConfirmAutoSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Auto-Submit?</DialogTitle>
            <DialogDescription>
              Enabling auto-submit will automatically apply to matching jobs
              without manual review. This action cannot be undone once jobs are
              submitted. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmAutoSubmit(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmAutoSubmit}>Enable</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
