import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { CalendarPlus, ChevronRight } from "lucide-react-native";
import {
  Screen,
  Section,
  ServiceCard,
  ProductCard,
  Skeleton,
  EmptyState,
  useTheme,
  Button,
  Avatar,
  Spacer,
} from "@timeo/ui";
import { useTimeoAuth } from "@timeo/auth";
import { api } from "@timeo/api";
import { useQuery } from "convex/react";
import { useCart } from "../providers/cart";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, activeOrg, activeTenantId } = useTimeoAuth();
  const { addItem } = useCart();

  const services = useQuery(
    api.services.list,
    activeTenantId ? { tenantId: activeTenantId as any } : "skip"
  );

  const products = useQuery(
    api.products.list,
    activeTenantId ? { tenantId: activeTenantId as any } : "skip"
  );

  const displayName = user?.firstName ?? "there";
  const orgName = activeOrg?.name ?? "Timeo";

  return (
    <Screen scroll>
      {/* Hero Section */}
      <View className="mb-2 mt-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text
              className="text-sm font-medium"
              style={{ color: theme.colors.textSecondary }}
            >
              Welcome back
            </Text>
            <Text
              className="mt-0.5 text-2xl font-bold"
              style={{ color: theme.colors.text }}
            >
              Hi, {displayName}!
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
            <Avatar
              src={user?.imageUrl}
              fallback={displayName}
              size="lg"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tenant Branding Banner */}
      <View
        className="mt-4 overflow-hidden rounded-2xl p-5"
        style={{ backgroundColor: theme.colors.primary }}
      >
        <Text className="text-lg font-bold text-white">{orgName}</Text>
        <Text className="mt-1 text-sm text-white/80">
          Book services and shop products all in one place.
        </Text>
        <View className="mt-4">
          <Button
            variant="outline"
            onPress={() => router.push("/(tabs)/services")}
            className="self-start border-white/30"
          >
            <View className="flex-row items-center">
              <CalendarPlus size={16} color="#FFFFFF" />
              <Text className="ml-2 font-semibold text-white">Book Now</Text>
            </View>
          </Button>
        </View>
      </View>

      {/* Featured Services */}
      <Section
        title="Services"
        seeAll={{
          onPress: () => router.push("/(tabs)/services"),
        }}
      >
        {services === undefined ? (
          <View className="flex-row gap-3">
            <Skeleton className="h-28 flex-1 rounded-2xl" />
            <Skeleton className="h-28 flex-1 rounded-2xl" />
          </View>
        ) : services.length === 0 ? (
          <EmptyState
            title="No services yet"
            description="This business hasn't added any services yet."
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {services.slice(0, 6).map((service) => (
              <View key={service._id} className="w-72">
                <ServiceCard
                  name={service.name}
                  description={service.description}
                  duration={service.durationMinutes}
                  price={service.price}
                  currency={service.currency}
                  onPress={() =>
                    router.push(`/services/${service._id}` as any)
                  }
                  onBook={() =>
                    router.push(`/services/${service._id}` as any)
                  }
                />
              </View>
            ))}
          </ScrollView>
        )}
      </Section>

      {/* Recent Products */}
      <Section
        title="Products"
        seeAll={{
          onPress: () => router.push("/(tabs)/products"),
        }}
      >
        {products === undefined ? (
          <View className="flex-row gap-3">
            <Skeleton className="h-52 flex-1 rounded-2xl" />
            <Skeleton className="h-52 flex-1 rounded-2xl" />
          </View>
        ) : products.length === 0 ? (
          <EmptyState
            title="No products yet"
            description="This business hasn't added any products yet."
          />
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {products.slice(0, 4).map((product) => (
              <View key={product._id} className="w-[48%]">
                <ProductCard
                  name={product.name}
                  description={product.description}
                  price={product.price}
                  currency={product.currency}
                  image={product.imageUrl}
                  onPress={() =>
                    router.push(`/products/${product._id}` as any)
                  }
                  onAddToCart={() =>
                    addItem({
                      productId: product._id,
                      name: product.name,
                      price: product.price,
                      image: product.imageUrl,
                      currency: product.currency,
                    })
                  }
                />
              </View>
            ))}
          </View>
        )}
      </Section>

      <Spacer size={24} />
    </Screen>
  );
}
