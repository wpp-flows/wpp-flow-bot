import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { authService } from '@/services/authService';
import { toast } from '@/stores/uiStore';
import type { Organization, User } from '@/types';

interface Props {
  user: User | null;
  organization: Organization | null;
  onUpdated: () => Promise<void> | void;
}

export function ProfileSection({ user, organization, onUpdated }: Props) {
  const [name, setName] = useState(user?.name ?? '');
  const [orgName, setOrgName] = useState(organization?.name ?? '');

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);
  useEffect(() => {
    if (organization?.name) setOrgName(organization.name);
  }, [organization?.name]);

  const save = useMutation({
    mutationFn: async () => {
      // Sequential — better-auth update first so we surface any auth failure
      // before we touch the org. Order is irrelevant for the UI.
      if (name && name !== user?.name) {
        await authService.updateUser({ name });
      }
      if (orgName && orgName !== organization?.name) {
        await authService.updateOrganization({ name: orgName });
      }
    },
    onSuccess: async () => {
      await onUpdated();
      toast.success('Perfil atualizado');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Falha ao salvar'),
  });

  const dirty =
    (name && name !== user?.name) ||
    (orgName && orgName !== organization?.name);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil</CardTitle>
        <CardDescription>
          Estas informações aparecem para sua equipe e para os clientes em alguns lugares.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar size="lg" name={user?.name ?? ''} src={user?.image ?? undefined} />
          <p className="text-2xs text-muted-foreground">
            Avatar é gerado a partir do seu nome. Upload de imagem em breve.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nome completo" htmlFor="settings-name">
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          <FormField
            label="Email"
            htmlFor="settings-email"
            hint="A troca de e-mail exige verificação e não está disponível por aqui."
          >
            <Input
              id="settings-email"
              type="email"
              value={user?.email ?? ''}
              disabled
            />
          </FormField>
          <FormField
            label="Nome do restaurante"
            htmlFor="settings-restaurant"
            className="sm:col-span-2"
          >
            <Input
              id="settings-restaurant"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </FormField>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>
            Salvar alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
