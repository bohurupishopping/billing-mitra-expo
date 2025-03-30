import React, { useState, useCallback, memo, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Platform,
  Modal,
  useColorScheme,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Picker } from '@react-native-picker/picker';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue, 
  withTiming,
  runOnJS,
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '../ThemedText';
import { FirebaseOrder } from '@/types/firebase-order';
import { WooCommerceOrder } from '@/types/woocommerce';
import { fetchOrders } from '@/services/api/orders';
import { fetchWooOrder, fetchLatestWooOrders } from '@/services/api/woo-orders';
import type { TransformedOrder, TransformedProduct } from '@/services/api/woo-orders';
import { fetchWooProduct, WooProduct } from '@/services/api/woo-products';
import { createFirebaseOrder } from '@/services/api/firebase-orders';
import { API_BASE_URL } from '@/constants/config';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 380;

interface WooCategory {
  id: number;
  name: string;
  slug: string;
}

// Optimized Product Card Component
const ProductCard = memo(({ product }: { product: TransformedProduct }) => {
  const colorScheme = useColorScheme();
  const [imageError, setImageError] = useState(false);

  const cardStyle = useMemo(() => [
    styles.productCard,
    { backgroundColor: colorScheme === 'dark' ? 'rgba(17, 24, 39, 0.4)' : 'rgba(255, 255, 255, 0.9)' }
  ], [colorScheme]);

  return (
    <Animated.View entering={FadeIn.duration(300).delay(200)}>
      <View style={cardStyle}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.05)', 'rgba(139, 92, 246, 0.02)']}
          style={styles.productCardGradient}
        >
          <View style={styles.productContent}>
            <View style={styles.productImageContainer}>
              <Image
                source={imageError || !product.image ? require('@/assets/images/placeholder.png') : { uri: product.image }}
                style={styles.productImage}
                onError={() => setImageError(true)}
              />
            </View>

            <View style={styles.productInfo}>
              <View style={styles.productHeader}>
                <View style={styles.productTitleRow}>
                  <MaterialCommunityIcons name="package-variant" size={16} color="#8B5CF6" style={styles.productIcon} />
                  <ThemedText type="defaultSemiBold" style={styles.productName} numberOfLines={2}>
                    {product.details}
                  </ThemedText>
                </View>
                <View style={styles.priceContainer}>
                  <MaterialCommunityIcons name="currency-inr" size={14} color="#8B5CF6" />
                  <ThemedText style={styles.productPrice}>
                    {product.sale_price}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.productMetaRow}>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="barcode" size={14} color="#8B5CF6" />
                  <ThemedText style={styles.metaText}>
                    {product.sku}
                  </ThemedText>
                </View>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="package-variant-closed" size={14} color="#8B5CF6" />
                  <ThemedText style={styles.metaText}>
                    Qty: {product.qty}
                  </ThemedText>
                </View>
              </View>

              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.variantsScroll}
                contentContainerStyle={styles.variantsScrollContent}
              >
                {product.colour && (
                  <View style={styles.variantBadge}>
                    <MaterialCommunityIcons name="palette" size={12} color="#8B5CF6" />
                    <ThemedText style={styles.variantText}>
                      {product.colour}
                    </ThemedText>
                  </View>
                )}
                {product.size && (
                  <View style={styles.variantBadge}>
                    <MaterialCommunityIcons name="ruler" size={12} color="#8B5CF6" />
                    <ThemedText style={styles.variantText}>
                      {product.size}
                    </ThemedText>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </LinearGradient>
      </View>
    </Animated.View>
  );
});

// Optimized Form Section Component
const FormSection = memo(({ title, children }: { title: string; children: React.ReactNode }) => {
  const colorScheme = useColorScheme();
  
  return (
    <Animated.View entering={SlideInRight.duration(300)}>
      <View style={[
        styles.formSection,
        { backgroundColor: colorScheme === 'dark' ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.8)' }
      ]}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.1)', 'rgba(139, 92, 246, 0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sectionGradient}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcons name="form-select" size={20} color="#8B5CF6" />
              <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
            </View>
          </View>
          {children}
        </LinearGradient>
      </View>
    </Animated.View>
  );
});

// Optimized Recent Orders Component
const RecentOrders = memo(({ orders, onOrderSelect }: {
  orders: string[];
  onOrderSelect: (orderId: string) => void;
}) => {
  const colorScheme = useColorScheme();
  
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.recentOrdersScroll}
      contentContainerStyle={styles.variantsScrollContent}
    >
      {orders.map((orderId, index) => (
        <Animated.View 
          key={orderId}
          entering={FadeIn.duration(300).delay(index * 100)}
        >
          <Pressable
            style={({ pressed }) => [
              styles.recentOrderButton,
              {
                backgroundColor: colorScheme === 'dark' 
                  ? 'rgba(139, 92, 246, 0.1)' 
                  : 'rgba(139, 92, 246, 0.05)',
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }]
              }
            ]}
            onPress={() => onOrderSelect(orderId)}
          >
            <View style={styles.recentOrderContent}>
              <MaterialCommunityIcons 
                name="shopping-outline" 
                size={14} 
                color="#8B5CF6" 
                style={styles.recentOrderIcon} 
              />
              <ThemedText style={styles.recentOrderText}>#{orderId}</ThemedText>
            </View>
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );
});

RecentOrders.displayName = 'RecentOrders';

interface CreateOrderFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateOrderForm({ onClose, onSuccess }: CreateOrderFormProps) {
  const colorScheme = useColorScheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [orderSearchError, setOrderSearchError] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<string[]>([]);
  const translateY = useSharedValue(height);
  const opacity = useSharedValue(0);
  const [formData, setFormData] = useState<{
    orderId: string;
    status: 'pending' | 'completed';
    orderstatus: string;
    customerName: string;
    email: string;
    phone: string;
    address: string;
    trackingId?: string;
    designUrl?: string;
    products: TransformedProduct[];
  }>({
    orderId: '',
    status: 'pending',
    orderstatus: 'Prepaid',
    customerName: '',
    email: '',
    phone: '',
    address: '',
    products: []
  });

  // Animation setup
  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    translateY.value = withSpring(0, {
      damping: 15,
      stiffness: 150
    });
  }, []);

  const handleDismiss = useCallback(() => {
    translateY.value = withSpring(height, {
      damping: 15,
      stiffness: 150
    });
    opacity.value = withTiming(0, {
      duration: 200
    }, () => {
      onClose();
    });
  }, [onClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Platform-specific haptic feedback
  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  }, []);

  // Fetch recent orders on mount using the orders API
  React.useEffect(() => {
    const loadRecentOrders = async () => {
      try {
        const orders = await fetchOrders({ per_page: 5 });
        setRecentOrders(orders.map(order => order.number.toString()));
      } catch (error) {
        console.error('Error loading recent orders:', error);
      }
    };
    loadRecentOrders();
  }, []);

  const handleOrderSearch = useCallback(async (orderId: string) => {
    if (!orderId) return;

    setIsLoadingOrder(true);
    setOrderSearchError(null);

    try {
      // Fetch the WooCommerce order details
      console.log(`Fetching WooCommerce order: ${orderId}`);
      const wooOrder = await fetchWooOrder(orderId);
      
      if (!wooOrder) {
        throw new Error('Order not found');
      }
      
      console.log(`Order ${orderId} found with ${wooOrder.products.length} products`);

      // Fetch product details for each line item
      const productsWithDetails = await Promise.all(
        wooOrder.products.map(async (product, index) => {
          try {
            // Always fetch product details to ensure we have images
            // Use product_id if available, otherwise try to parse from SKU
            let productId: number | undefined;
            
            if (product.product_id) {
              productId = product.product_id;
              console.log(`Using product_id ${productId} from line item for product ${index}`);
            } else {
              // Try different SKU parsing strategies
              console.log(`No product_id found for product ${index}, attempting to parse from SKU: ${product.sku}`);
              
              // Strategy 1: Try to parse the first part of the SKU as a number
              const skuParts = product.sku.split('-');
              let parsedId = parseInt(skuParts[0]);
              
              // Strategy 2: Try to extract digits from the beginning of the SKU
              if (isNaN(parsedId)) {
                const matches = product.sku.match(/^(\d+)/);
                if (matches && matches[1]) {
                  parsedId = parseInt(matches[1]);
                }
              }
              
              if (!isNaN(parsedId)) {
                productId = parsedId;
                console.log(`Successfully parsed product ID ${productId} from SKU: ${product.sku}`);
              }
            }
            
            if (!productId) {
              console.warn(`Could not determine product ID for item ${index}, SKU: ${product.sku}`);
              return product;
            }
            
            console.log(`Fetching product details for ID: ${productId}, SKU: ${product.sku}`);
            const productData = await fetchWooProduct(productId);
            
            if (!productData) {
              console.warn(`No product data returned for ID: ${productId}`);
              return product;
            }
            
            console.log(`Product data fetched for ID ${productId}:`, {
              id: productData.id,
              name: productData.name,
              hasImages: productData.images && productData.images.length > 0,
              imageCount: productData.images?.length || 0
            });
            
            // Update product with additional details
            const updatedProduct = {
              ...product,
              image: productData.images && productData.images.length > 0 
                ? productData.images[0].src 
                : product.image || '',
              product_page_url: productData.permalink || product.product_page_url || '',
              product_category: productData.categories && productData.categories.length > 0
                ? productData.categories.map(cat => cat.name).join(' | ')
                : product.product_category || ''
            };
            
            console.log(`Updated product ${index} with details:`, {
              sku: updatedProduct.sku,
              hasImage: !!updatedProduct.image,
              imageUrl: updatedProduct.image,
              product_page_url: updatedProduct.product_page_url,
              product_category: updatedProduct.product_category
            });
            
            return updatedProduct;
          } catch (error) {
            console.error(`Error fetching product details for product ${index}:`, error);
            return product;
          }
        })
      );

      // Log the products with details to verify images are present
      console.log('Products with details:', productsWithDetails.map(p => ({
        sku: p.sku,
        hasImage: !!p.image,
        imageUrl: p.image,
        product_page_url: p.product_page_url,
        product_category: p.product_category
      })));

      // Extract tracking number if available
      let trackingNumber = '';
      const trackingMetaItem = wooOrder.meta_data?.find(meta => 
        meta.key === '_wc_shipment_tracking_items'
      );
      
      if (trackingMetaItem) {
        try {
          const trackingItems = typeof trackingMetaItem.value === 'string'
            ? JSON.parse(trackingMetaItem.value)
            : trackingMetaItem.value;
            
          if (Array.isArray(trackingItems) && trackingItems.length > 0) {
            trackingNumber = trackingItems[0].tracking_number || '';
          }
        } catch (err) {
          console.error('Error parsing tracking meta data', err);
        }
      }

      // Set form data with the transformed order
      setFormData({
        orderId: wooOrder.orderId,
        status: 'pending',
        orderstatus: wooOrder.orderstatus,
        customerName: wooOrder.customerName,
        email: wooOrder.email || '',
        phone: wooOrder.phone || '',
        address: wooOrder.address || '',
        trackingId: trackingNumber || '',
        designUrl: '',
        products: productsWithDetails
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      setOrderSearchError('Order not found or error occurred');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsLoadingOrder(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      if (!formData.orderId) {
        throw new Error('Order ID is required');
      }

      if (!formData.products || formData.products.length === 0) {
        throw new Error('Order must have at least one product');
      }

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Format the order data for Firebase
      const orderToCreate = {
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create the order in Firebase
      await createFirebaseOrder(orderToCreate);
      
      // Show success feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Call the success callback if provided
      onSuccess?.();
      
      // Close the form
      handleDismiss();
    } catch (error) {
      console.error('Error creating order:', error);
      
      // Show error feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      // Set error message
      setOrderSearchError(error instanceof Error ? error.message : 'Failed to create order');
    }
  }, [formData, onSuccess, handleDismiss]);

  return (
    <Modal
      visible={true}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={styles.backdropPressable} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View style={[styles.modalContainer, modalStyle]}>
          <View style={[
            styles.modalContent,
            {
              backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#FFFFFF'
            }
          ]}>
            <View style={styles.dragHandle} />

            <View style={[
              styles.header,
              {
                backgroundColor: colorScheme === 'dark' 
                  ? 'rgba(88, 28, 135, 0.1)' 
                  : 'rgba(139, 92, 246, 0.1)'
              }
            ]}>
              <Pressable
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: colorScheme === 'dark' 
                      ? 'rgba(31, 41, 55, 0.8)' 
                      : 'rgba(255, 255, 255, 0.8)'
                  }
                ]}
                onPress={handleDismiss}>
                <MaterialCommunityIcons 
                  name="close"
                  size={24}
                  color={colorScheme === 'dark' ? '#E5E7EB' : '#374151'}
                />
              </Pressable>

              <View style={styles.headerContent}>
                <View style={[
                  styles.headerIconContainer,
                  {
                    backgroundColor: colorScheme === 'dark' 
                      ? 'rgba(139, 92, 246, 0.2)' 
                      : 'rgba(139, 92, 246, 0.1)'
                  }
                ]}>
                  <MaterialCommunityIcons
                    name="plus-circle"
                    size={20}
                    color="#8B5CF6"
                  />
                </View>
                <ThemedText type="title" style={styles.formTitle}>
                  Create New Order
                </ThemedText>
              </View>
            </View>

            <ScrollView
              style={styles.formContent}
              showsVerticalScrollIndicator={false}
              bounces={true}>
              {/* Search Section */}
              <View style={styles.searchSection}>
                <View style={styles.searchInputContainer}>
                  <MaterialCommunityIcons 
                    name="magnify" 
                    size={22} 
                    color="#8B5CF6"
                    style={styles.searchIcon}
                  />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Enter WooCommerce Order ID"
                    placeholderTextColor={colorScheme === 'dark' ? 'rgba(156, 163, 175, 0.8)' : 'rgba(107, 114, 128, 0.8)'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={() => handleOrderSearch(searchQuery)}
                    keyboardType="number-pad"
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <Pressable
                      onPress={() => setSearchQuery('')}
                      style={styles.clearButton}
                    >
                      <MaterialCommunityIcons 
                        name="close-circle" 
                        size={18} 
                        color="rgba(107, 114, 128, 0.6)" 
                      />
                    </Pressable>
                  )}
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.searchButton,
                    { opacity: pressed ? 0.8 : 1 }
                  ]}
                  onPress={() => handleOrderSearch(searchQuery)}
                  disabled={isLoadingOrder}
                >
                  {isLoadingOrder ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
                      <ThemedText style={styles.searchButtonText}>
                        Search
                      </ThemedText>
                    </>
                  )}
                </Pressable>
              </View>

              {/* Recent Orders */}
              {recentOrders.length > 0 && (
                <View style={styles.recentOrdersSection}>
                  <ThemedText style={styles.sectionTitle}>Recent Orders:</ThemedText>
                  <RecentOrders
                    orders={recentOrders}
                    onOrderSelect={(orderId) => {
                      setSearchQuery(orderId);
                      handleOrderSearch(orderId);
                    }}
                  />
                </View>
              )}

              {/* Error Message */}
              {orderSearchError && (
                <View style={[
                  styles.errorContainer,
                  {
                    backgroundColor: colorScheme === 'dark' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(254, 226, 226, 0.5)'
                  }
                ]}>
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={20}
                    color="#DC2626"
                  />
                  <ThemedText style={styles.errorText}>{orderSearchError}</ThemedText>
                </View>
              )}

              {/* Form Fields */}
              {formData.orderId && (
                <View style={styles.formFields}>
                  {/* Order Details */}
                  <View style={styles.formSection}>
                    <ThemedText style={styles.sectionTitle}>Order Details</ThemedText>
                    
                    <View style={styles.fieldRow}>
                      <View style={styles.field}>
                        <ThemedText style={styles.fieldLabel}>Order ID</ThemedText>
                        <View style={[
                          styles.input,
                          { backgroundColor: colorScheme === 'dark' ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.5)' }
                        ]}>
                          <ThemedText>{formData.orderId}</ThemedText>
                        </View>
                      </View>
                      
                      <View style={styles.field}>
                        <ThemedText style={styles.fieldLabel}>Customer Name</ThemedText>
                        <View style={[
                          styles.input,
                          { backgroundColor: colorScheme === 'dark' ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.5)' }
                        ]}>
                          <ThemedText>{formData.customerName}</ThemedText>
                        </View>
                      </View>
                    </View>

                    <View style={styles.fieldRow}>
                      <View style={styles.field}>
                        <ThemedText style={styles.fieldLabel}>Payment Status</ThemedText>
                        <View style={[
                          styles.input,
                          { backgroundColor: colorScheme === 'dark' ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.5)' }
                        ]}>
                          <Picker
                            selectedValue={formData.orderstatus}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, orderstatus: value }))}
                            style={styles.picker}
                          >
                            <Picker.Item label="Prepaid" value="Prepaid" />
                            <Picker.Item label="COD" value="COD" />
                          </Picker>
                        </View>
                      </View>
                      
                      <View style={styles.field}>
                        <ThemedText style={styles.fieldLabel}>Order Status</ThemedText>
                        <View style={[
                          styles.input,
                          { backgroundColor: colorScheme === 'dark' ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.5)' }
                        ]}>
                          <Picker
                            selectedValue={formData.status}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                            style={styles.picker}
                          >
                            <Picker.Item label="PENDING" value="pending" />
                            <Picker.Item label="COMPLETED" value="completed" />
                          </Picker>
                        </View>
                      </View>
                    </View>

                    <View style={styles.field}>
                      <ThemedText style={styles.fieldLabel}>Design URL</ThemedText>
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: colorScheme === 'dark' ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.5)' }
                        ]}
                        value={formData.designUrl}
                        onChangeText={(value) => setFormData(prev => ({ ...prev, designUrl: value }))}
                        placeholder="Enter design URL"
                        placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                      />
                    </View>

                    <View style={styles.field}>
                      <ThemedText style={styles.fieldLabel}>Tracking/AWB Number</ThemedText>
                      <TextInput
                        style={[
                          styles.input,
                          { backgroundColor: colorScheme === 'dark' ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.5)' }
                        ]}
                        value={formData.trackingId}
                        onChangeText={(value) => setFormData(prev => ({ ...prev, trackingId: value }))}
                        placeholder="Enter tracking number"
                        placeholderTextColor={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                      />
                    </View>
                  </View>

                  {/* Products Section */}
                  {formData.products.length > 0 && (
                    <View style={styles.formSection}>
                      <View style={styles.sectionHeader}>
                        <ThemedText style={styles.sectionTitle}>Products</ThemedText>
                        <ThemedText style={styles.productCount}>
                          {formData.products.length} items
                        </ThemedText>
                      </View>
                      
                      <View style={styles.productsList}>
                        {formData.products.map((product, index) => (
                          <ProductCard
                            key={`${product.sku}-${index}`}
                            product={product}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  {
                    backgroundColor: '#8B5CF6',
                    opacity: pressed ? 0.8 : 1
                  }
                ]}
                onPress={handleSubmit}
              >
                <ThemedText style={styles.submitButtonText}>
                  Create Order
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdropPressable: {
    flex: 1,
  },
  modalContainer: {
    height: '90%',
    backgroundColor: 'transparent',
  },
  modalContent: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(156, 163, 175, 0.4)',
    borderRadius: 4,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(75, 85, 99, 0.15)',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    left: 12,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  headerIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  formTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  formContent: {
    flex: 1,
    padding: 12,
  },
  footer: {
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(75, 85, 99, 0.15)',
  },
  submitButton: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  searchSection: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.1)',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    paddingLeft: 16,
    paddingRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    minWidth: 180,
    paddingVertical: 10,
  },
  clearButton: {
    padding: 4,
    marginLeft: 6,
  },
  searchButton: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    gap: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  recentOrdersSection: {
    paddingHorizontal: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  recentOrdersScroll: {
    marginTop: 4,
  },
  recentOrderButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    marginRight: 6,
  },
  recentOrderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recentOrderIcon: {
    opacity: 0.8,
  },
  recentOrderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 8,
    borderRadius: 8,
  },
  errorText: {
    marginLeft: 6,
    color: '#DC2626',
    fontSize: 12,
  },
  formFields: {
    padding: 12,
  },
  formSection: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionGradient: {
    padding: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  productCount: {
    fontSize: 12,
    opacity: 0.7,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  field: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: 6,
    color: '#6B7280',
    fontWeight: '500',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  input: {
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
  },
  picker: {
    height: 42,
    width: '100%',
  },
  productsList: {
    gap: 8,
  },
  productCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
  },
  productCardGradient: {
    padding: 12,
  },
  productContent: {
    flexDirection: 'row',
    gap: 12,
  },
  productImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productInfo: {
    flex: 1,
    gap: 6,
  },
  productHeader: {
    gap: 4,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  productIcon: {
    marginTop: 2,
  },
  productName: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#374151',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
    marginLeft: 2,
  },
  productMetaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  variantsScroll: {
    marginTop: 6,
  },
  variantsScrollContent: {
    flexDirection: 'row',
    gap: 6,
  },
  variantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  variantText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8B5CF6',
  },
}); 