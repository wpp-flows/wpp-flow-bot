import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { createBotSchema, type CreateBotFormValues } from '@/lib/schemas';
import { botService } from '@/services/botService';
import { invalidateQueriesByFilters, queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/uiStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateBotModal({ open, onClose }: Props) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBotFormValues>({
    resolver: zodResolver(createBotSchema),
    defaultValues: { name: '', phoneNumber: '' },
  });

  const create = useMutation({
    mutationFn: (values: CreateBotFormValues) => botService.create(values),
    onSuccess: (bot) => {
      void invalidateQueriesByFilters(qc, [{ queryKey: queryKeys.bots.all }]);
      toast.success('Bot created', `${bot.name} is initializing — scan the QR to bring it online.`);
      reset();
      onClose();
    },
    onError: () => toast.error('Could not create bot', 'Please try again.'),
  });

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Create new bot"
      description="Spin up a new WhatsApp instance via the Evolution API."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-bot-form"
            loading={isSubmitting || create.isPending}
          >
            Create bot
          </Button>
        </>
      }
    >
      <form
        id="create-bot-form"
        onSubmit={handleSubmit((v) => create.mutate(v))}
        className="flex flex-col gap-4 py-1"
        noValidate
      >
        <FormField
          label="Bot name"
          htmlFor="bot-name"
          error={errors.name?.message}
          required
        >
          <Input
            id="bot-name"
            placeholder="e.g. Bellini Main"
            invalid={!!errors.name}
            {...register('name')}
          />
        </FormField>
        <FormField
          label="WhatsApp phone number"
          htmlFor="bot-phone"
          hint="Optional — assign later when scanning the QR."
          error={errors.phoneNumber?.message}
        >
          <Input
            id="bot-phone"
            placeholder="+15551234567"
            invalid={!!errors.phoneNumber}
            {...register('phoneNumber')}
          />
        </FormField>
      </form>
    </Modal>
  );
}
