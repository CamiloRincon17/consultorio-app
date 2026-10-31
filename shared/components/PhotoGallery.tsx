import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useThemedStyles, type Palette } from '../theme';
import { pickImage, uploadProcedurePhoto } from '../../services/supabase/storageService';
import { useDialog } from '../context/DialogContext';

export interface PhotoWithVisitInfo {
  url: string;
  visitId?: string;
  visitDate?: string;
  visitReason?: string;
  visitTreatment?: string;
}

interface PhotoGalleryProps {
  photos?: string[];
  photosWithInfo?: PhotoWithVisitInfo[];
  onAddPhoto?: (photoUrl: string) => void;
  onDeletePhoto?: (photoUrl: string) => void;
  onAddPhotoInVisit?: () => void;
  patientId?: string;
  visitId?: string;
  readOnly?: boolean;
  title?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos = [],
  photosWithInfo,
  onAddPhoto,
  onDeletePhoto,
  onAddPhotoInVisit,
  patientId = '',
  visitId = '',
  readOnly = false,
  title = 'Fotografías del Procedimiento',
  iconName = 'camera-outline',
  iconSize = 24,
}) => {
  const dialog = useDialog();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const [loading, setLoading] = useState(false);
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PhotoWithVisitInfo | null>(null);

  // Normalizar lista de fotos
  const items: PhotoWithVisitInfo[] = React.useMemo(() => {
    if (photosWithInfo && photosWithInfo.length > 0) return photosWithInfo;
    return photos.map((url) => ({ url }));
  }, [photos, photosWithInfo]);

  const handleAddPress = () => {
    if (onAddPhotoInVisit) {
      onAddPhotoInVisit();
    } else {
      setPickerModalVisible(true);
    }
  };

  const handlePick = async (source: 'camera' | 'library') => {
    setPickerModalVisible(false);
    const localUri = await pickImage(source);
    if (!localUri) return;

    setLoading(true);
    try {
      const uploadedUrl = await uploadProcedurePhoto(patientId, visitId, localUri);
      if (onAddPhoto) {
        onAddPhoto(uploadedUrl);
      }
    } catch (e) {
      console.error('Error procesando foto:', e);
      dialog.alert('Error', 'No se pudo guardar la fotografía.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (photoUrl: string) => {
    dialog.confirm(
      'Eliminar Fotografía',
      '¿Estás seguro de eliminar esta fotografía del procedimiento?',
      () => {
        setSelectedItem(null);
        if (onDeletePhoto) {
          onDeletePhoto(photoUrl);
        }
      },
      'danger'
    );
  };

  return (
    <View style={styles.container}>
      {title ? (
        <View style={styles.header}>
          <Ionicons name={iconName} size={iconSize} color={colors.primary} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.badgeCount}>{items.length}</Text>
        </View>
      ) : null}

      {!readOnly && items.length === 0 ? (
        <TouchableOpacity
          style={styles.fullAddButton}
          onPress={handleAddPress}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={38} color={colors.primary} />
              <Text style={styles.fullAddText}>
                {onAddPhotoInVisit ? 'Agregar foto en una Cita' : 'Agregar foto'}
              </Text>
              {onAddPhotoInVisit && (
                <Text style={styles.fullAddSubtext}>
                  Las fotos pertenecen al historial de citas del paciente
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollList}>
          {/* Botón para agregar foto */}
          {!readOnly && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddPress}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={30} color={colors.primary} />
                  <Text style={styles.addText}>
                    {onAddPhotoInVisit ? '+ Cita' : 'Agregar foto'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Lista de miniaturas */}
          {items.map((item, index) => (
            <TouchableOpacity
              key={`${item.url}-${index}`}
              style={styles.thumbnailWrap}
              onPress={() => setSelectedItem(item)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: item.url }} style={styles.thumbnail} contentFit="cover" transition={200} />
              
              {/* Badge de procedimiento y fecha de la cita */}
              {(item.visitDate || item.visitReason || item.visitTreatment) && (
                <View style={styles.dateBadgeOverlay}>
                  {(item.visitTreatment || item.visitReason) && (
                    <Text style={styles.procedureBadgeText} numberOfLines={1}>
                      🩺 {item.visitTreatment || item.visitReason}
                    </Text>
                  )}
                  {item.visitDate && (
                    <Text style={styles.dateBadgeText} numberOfLines={1}>
                      📅 {item.visitDate}
                    </Text>
                  )}
                </View>
              )}

              {!readOnly && onDeletePhoto && (
                <TouchableOpacity
                  style={styles.miniDeleteBtn}
                  onPress={() => handleDelete(item.url)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Modal de selección Cámara / Galería */}
      <Modal visible={pickerModalVisible} transparent animationType="fade" onRequestClose={() => setPickerModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerModalVisible(false)}>
          <View style={styles.actionSheet}>
            <Text style={styles.actionSheetTitle}>Agregar Fotografía Clínica</Text>
            
            <TouchableOpacity style={styles.actionOption} onPress={() => handlePick('camera')}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
                <Ionicons name="camera" size={22} color={colors.primary} />
              </View>
              <Text style={styles.actionText}>Tomar foto con Cámara</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionOption} onPress={() => handlePick('library')}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
                <Ionicons name="images" size={22} color={colors.success} />
              </View>
              <Text style={styles.actionText}>Elegir de la Galería</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelOption} onPress={() => setPickerModalVisible(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Visor de pantalla completa */}
      <Modal visible={!!selectedItem} transparent animationType="fade" onRequestClose={() => setSelectedItem(null)}>
        <View style={styles.fullScreenContainer}>
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity style={styles.fullScreenCloseBtn} onPress={() => setSelectedItem(null)}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            {!readOnly && selectedItem && onDeletePhoto && (
              <TouchableOpacity style={styles.fullScreenDeleteBtn} onPress={() => handleDelete(selectedItem.url)}>
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
                <Text style={styles.fullScreenDeleteText}>Eliminar</Text>
              </TouchableOpacity>
            )}
          </View>

          {selectedItem && (
            <Image
              source={{ uri: selectedItem.url }}
              style={styles.fullScreenImage}
              contentFit="contain"
              transition={300}
            />
          )}

          {/* Tarjeta inferior con información de la Cita */}
          {selectedItem && (selectedItem.visitDate || selectedItem.visitReason || selectedItem.visitTreatment) && (
            <View style={styles.fullScreenVisitInfoCard}>
              {selectedItem.visitDate && (
                <View style={styles.visitInfoRow}>
                  <Ionicons name="calendar-outline" size={16} color="#60A5FA" />
                  <Text style={styles.visitInfoDate}>Cita del: {selectedItem.visitDate}</Text>
                </View>
              )}
              {(selectedItem.visitTreatment || selectedItem.visitReason) && (
                <View style={styles.visitInfoRow}>
                  <Ionicons name="medkit-outline" size={16} color="#34D399" />
                  <Text style={styles.visitInfoText} numberOfLines={2}>
                    {selectedItem.visitTreatment || selectedItem.visitReason}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  badgeCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  fullAddButton: {
    width: '100%',
    height: 120,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  fullAddText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  fullAddSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  scrollList: {
    gap: 12,
    paddingRight: 10,
  },
  addButton: {
    width: 105,
    height: 105,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  addText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  thumbnailWrap: {
    width: 105,
    height: 105,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  dateBadgeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 3,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  procedureBadgeText: {
    color: '#60A5FA',
    fontSize: 9,
    fontWeight: '700',
  },
  dateBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  miniDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal Actions
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  cancelOption: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Full Screen Viewer
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  fullScreenHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  fullScreenCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  fullScreenDeleteText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  fullScreenVisitInfoCard: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: 14,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  visitInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitInfoDate: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '700',
  },
  visitInfoText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
