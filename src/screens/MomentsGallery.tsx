import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    Pressable,
    Modal,
    Share,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, borderRadius, shadows } from '../theme/colors';

const MOMENTS_DIR = ((FileSystem as any).documentDirectory || '') + 'moments/';

interface Moment {
    id: string;
    uri: string;
    date: number;
    duration?: number;
}

export default function MomentsGallery() {
    const navigation = useNavigation();
    const [moments, setMoments] = useState<Moment[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<Moment | null>(null);

    // Load videos
    useEffect(() => {
        loadMoments();
    }, []);

    const loadMoments = async () => {
        try {
            // Ensure directory exists
            const dirInfo = await FileSystem.getInfoAsync(MOMENTS_DIR);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(MOMENTS_DIR, { intermediates: true });
                setMoments([]);
                return;
            }

            const files = await FileSystem.readDirectoryAsync(MOMENTS_DIR);
            const videoFiles = files.filter(f => f.endsWith('.mp4'));

            const items: Moment[] = videoFiles.map(filename => {
                // Parse timestamp from filename "sign_123456789.mp4"
                const match = filename.match(/sign_(\d+)\.mp4/);
                const date = match ? parseInt(match[1]) : Date.now();
                return {
                    id: filename,
                    uri: MOMENTS_DIR + filename,
                    date,
                };
            }).sort((a, b) => b.date - a.date); // Newest first

            setMoments(items);
        } catch (error) {
            console.error("Error loading moments:", error);
        }
    };

    const handleShare = async (moment: Moment) => {
        if (!moment) return;
        try {
            await Share.share({
                url: moment.uri,
                title: 'My Baby Sign Video',
                message: 'Check out my baby practicing signs!',
            });
        } catch (error) {
            console.error("Share error:", error);
        }
    };

    const handleDelete = (moment: Moment) => {
        Alert.alert(
            "Delete Video",
            "Are you sure you want to delete this moment?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await FileSystem.deleteAsync(moment.uri);
                            if (selectedVideo?.id === moment.id) setSelectedVideo(null);
                            loadMoments();
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }
            ]
        );
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </Pressable>
                <Text style={styles.title}>My Moments 📹</Text>
            </View>

            {moments.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>📭</Text>
                    <Text style={styles.emptyText}>No videos yet!</Text>
                    <Text style={styles.emptySubtext}>Record your child practicing signs to save them here.</Text>
                </View>
            ) : (
                <FlatList
                    data={moments}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.grid}
                    renderItem={({ item }) => (
                        <Pressable style={styles.thumbnail} onPress={() => setSelectedVideo(item)}>
                            <View style={styles.thumbnailPlaceholder}>
                                <Text style={styles.playIcon}>▶️</Text>
                            </View>
                            <View style={styles.metaContainer}>
                                <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                            </View>
                        </Pressable>
                    )}
                />
            )}

            {/* Video Player Modal */}
            <Modal
                visible={!!selectedVideo}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedVideo(null)}
            >
                <View style={styles.modalOverlay}>
                    <SafeAreaView style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Pressable onPress={() => setSelectedVideo(null)} style={styles.iconButton}>
                                <Text>❌ Close</Text>
                            </Pressable>
                            <Pressable onPress={() => selectedVideo && handleShare(selectedVideo)} style={styles.iconButton}>
                                <Text>📤 Share</Text>
                            </Pressable>
                        </View>

                        {selectedVideo && (
                            <Video
                                source={{ uri: selectedVideo.uri }}
                                style={styles.videoPlayer}
                                useNativeControls
                                resizeMode={ResizeMode.CONTAIN}
                                shouldPlay
                                isLooping
                            />
                        )}

                        <Pressable
                            style={styles.deleteButton}
                            onPress={() => selectedVideo && handleDelete(selectedVideo)}
                        >
                            <Text style={styles.deleteText}>🗑️ Delete Video</Text>
                        </Pressable>
                    </SafeAreaView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgPrimary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.cardBorder,
    },
    backButton: {
        padding: spacing.sm,
    },
    backButtonText: {
        fontSize: 16,
        color: colors.accentPrimary,
        fontWeight: '600',
    },
    title: {
        flex: 1,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginRight: 40, // Balance back button
    },
    grid: {
        padding: spacing.md,
    },
    thumbnail: {
        flex: 1,
        margin: spacing.xs,
        backgroundColor: '#eee',
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        height: 150,
        ...shadows.card,
    },
    thumbnailPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ddd',
    },
    playIcon: {
        fontSize: 32,
    },
    metaContainer: {
        padding: spacing.xs,
        backgroundColor: '#fff',
    },
    dateText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    modalContent: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: spacing.md,
    },
    iconButton: {
        padding: spacing.sm,
        backgroundColor: '#fff',
        borderRadius: borderRadius.md,
    },
    videoPlayer: {
        flex: 1,
        width: '100%',
        backgroundColor: '#000',
    },
    deleteButton: {
        padding: spacing.md,
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        margin: spacing.md,
        borderRadius: borderRadius.md,
    },
    deleteText: {
        color: '#dc2626',
        fontWeight: '600',
    },
});
