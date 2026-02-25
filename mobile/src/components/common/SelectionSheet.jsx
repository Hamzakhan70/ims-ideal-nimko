import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AppButton from './AppButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const SelectionSheet = ({
  visible,
  title,
  items,
  itemLabel = (item) => item?.name || '-',
  itemSubLabel = () => null,
  onSelect,
  onClose
}) => {
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!visible) {
      setSearchText('');
    }
  }, [visible]);

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items;
    return items.filter((item) => itemLabel(item).toLowerCase().includes(searchText.toLowerCase()));
  }, [items, searchText, itemLabel]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => null}>
          <Text style={styles.title}>{title}</Text>

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search..."
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
          />

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {filteredItems.map((item) => (
              <Pressable
                key={item._id}
                style={styles.item}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.itemTitle}>{itemLabel(item)}</Text>
                {itemSubLabel(item) ? <Text style={styles.itemSub}>{itemSubLabel(item)}</Text> : null}
              </Pressable>
            ))}
            {filteredItems.length === 0 ? <Text style={styles.emptyText}>No matching records</Text> : null}
          </ScrollView>

          <AppButton title="Close" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end'
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    gap: spacing.md
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary
  },
  list: {
    maxHeight: 360
  },
  item: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundMuted
  },
  itemTitle: {
    color: colors.textPrimary,
    fontWeight: '700'
  },
  itemSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: spacing.xl
  }
});

export default SelectionSheet;
