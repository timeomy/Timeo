import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { CalendarPlus, Building2 } from "lucide-react-native";
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
import { useTimeoAuth, useTenantSwitcher } from "@timeo/auth";
import { useServices, useProducts } from "@timeo/api-client";
import { useCart } from "@/providers/cart";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, activeTenantId } = useTimeoAuth();
  const { activeTenant } = useTenantSwitcher();
  const { addItem } = useCart();

  const { data: services, isLoading: isLoadingServices } = useServices(activeTenantId);
  const { data: products, isLoading: isLoadingProducts } = useProducts(activeTenantId);

  const displayName = user?.name?.split(" ")[0] ?? "there";
  const orgName = activeTenant?.name ?? "Timeo";

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
          <TouchableOpacity onPress={() => router.push("/(main)/(customer)/(tabs)/profile")}>
            <Avatar
              src={user?.imageUrl}
              fallback={displayName}
              size="lg"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tenant Branding Banner or Join Prompt */}
      {!activeTenantId ? (
        <View
          className="mt-4 overflow-hidden rounded-2xl border p-5"
          style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.surface }}
        >
          <View className="items-center">
            <View
              className="mb-3 rounded-2xl p-4"
              style={{ backgroundColor: theme.colors.primary + "15" }}
            >
              <Building2 size={32} color={theme.colors.primary} />
            </View>
            <Text
              className="text-lg font-bold text-center"
              style={{ color: theme.colors.text }}
            >
              Join a Business
            </Text>
            <Text
              className="mt-1 text-sm text-center"
              style={{ color: theme.colors.textSecondary }}
            >
              Enter a business slug to browse their services and products.
            </Text>
          </View>
          <View className="mt-4">
            <Button onPress={() => router.push("/join" as any)}>
              Find & Join Business
            </Button>
          </View>
        </View>
      ) : (
        <View
          className="mt-4 overflow-hidden rounded-2xl p-5"
          style={{ backgroundColor: theme.colors.primary }}
        >
          <Text className="text-lg font-bold" style={{ color: "#0B0B0F" }}>{orgName}</Text>
          <Text className="mt-1 text-sm" style={{ color: "#0B0B0F99" }}>
            Book services and shop products all in one place.
          </Text>
          <View className="mt-4">
            <Button
              variant="outline"
              onPress={() => router.push("/(main)/(customer)/(tabs)/services")}
              className="self-start"
              style={{ borderColor: "#0B0B0F30" }}
            >
              <View className="flex-row items-center">
                <CalendarPlus size={16} color="#0B0B0F" />
                <Text className="ml-2 font-semibold" style={{ color: "#0B0B0F" }}>Book Now</Text>
              </View>
            </Button>
          </View>
        </View>
      )}

      {/* Featured Services */}
      <Section
        title="Services"
        seeAll={{
          onPress: () => router.push("/(main)/(customer)/(tabs)/services"),
        }}
      >
        {isLoadingServices ? (
          <View className="flex-row gap-3">
            <Skeleton className="h-28 flex-1 rounded-2xl" />
            <Skeleton className="h-28 flex-1 rounded-2xl" />
          </View>
        ) : !services || services.length === 0 ? (
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
              <View key={service.id} className="w-72">
                <ServiceCard
                  name={service.name}
                  description={service.description}
                  duration={service.durationMinutes}
                  price={service.price}
                  currency={service.currency}
                  onPress={() =>
                    router.push(`/services/${service.id}` as any)
                  }
                  onBook={() =>
                    router.push(`/services/${service.id}` as any)
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
          onPress: () => router.push("/(main)/(customer)/(tabs)/products"),
        }}
      >
        {isLoadingProducts ? (
          <View className="flex-row gap-3">
            <Skeleton className="h-52 flex-1 rounded-2xl" />
            <Skeleton className="h-52 flex-1 rounded-2xl" />
          </View>
        ) : !products || products.length === 0 ? (
          <EmptyState
            title="No products yet"
            description="This business hasn't added any products yet."
          />
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {products.slice(0, 4).map((product) => (
              <View key={product.id} className="w-[48%]">
                <ProductCard
                  name={product.name}
                  description={product.description}
                  price={product.price}
                  currency={product.currency}
                  image={product.imageUrl}
                  onPress={() =>
                    router.push(`/products/${product.id}` as any)
                  }
                  onAddToCart={() =>
                    addItem({
                      productId: product.id,
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
