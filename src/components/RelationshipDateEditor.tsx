import * as Haptics from 'expo-haptics';

import { AppDatePicker } from '@/components/AppDatePicker';
import { useApp } from '@/context/AppContext';
import { useDialog } from '@/context/DialogContext';
import { toDateOnly } from '@/utils/dates';

type RelationshipDateEditorProps = {
  visible: boolean;
  onClose: () => void;
};

export function RelationshipDateEditor({ visible, onClose }: RelationshipDateEditorProps) {
  const { couple, updateRelationshipDate } = useApp();
  const { showDialog } = useDialog();

  if (!couple) {
    return null;
  }

  const saveRelationshipDate = async (relationshipDate: string) => {
    if (relationshipDate === couple.relationshipStartedAt) {
      return;
    }

    try {
      await updateRelationshipDate(relationshipDate);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      showDialog({
        title: 'Не получилось изменить дату',
        message: error instanceof Error ? error.message : 'Попробуйте ещё раз.',
        tone: 'danger',
      });
    }
  };

  return (
    <AppDatePicker
      visible={visible}
      value={couple.relationshipStartedAt}
      title="Дата начала отношений"
      maximumDate={toDateOnly(new Date())}
      onSelect={(relationshipDate) => void saveRelationshipDate(relationshipDate)}
      onClose={onClose}
    />
  );
}
