// frontend/src/utils/geocoding.ts

/**
 * Utilitário para geocodificação de endereços usando mocks e OpenRouteService.
 * - Fornece coordenadas mockadas para endereços conhecidos (evita depender sempre da API).
 * - Fallback para chamada real na API ORS quando não há mock.
 */

export const ORS_API_KEY =
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImUwZGJlZDIyODYzZjQ2MmNhYWFlY2EyNGQ1MWFjMDI0IiwiaCI6Im11cm11cjY0In0=";

export type LatLng = { latitude: number; longitude: number };

// Coordenadas mockadas para alguns endereços.
export const mockedCoordinates: {
  [key: string]: LatLng;
} = {
  "Rua Dr. Salles de Oliveira, 1380, Vila Industrial, Campinas, SP": {
    latitude: -22.91506,
    longitude: -47.08155,
  },
  "Avenida da Amizade, 2300, Vila Carlota, Sumaré, SP": {
    latitude: -22.81308,
    longitude: -47.25197,
  },
  "Rua Luiz Camilo de Camargo, 585, Centro, Hortolândia, SP": {
    latitude: -22.8596,
    longitude: -47.22013,
  },
  "Av. Iguatemi, 777, Vila Brandina, Campinas, SP": {
    latitude: -22.89531,
    longitude: -47.02115,
  },
  "Rua Antônio de Castro, 123, Sousas, Campinas, SP": {
    latitude: -22.88045,
    longitude: -46.96695,
  },
  "Avenida Olivo Callegari, 789, Centro, Sumaré, SP": {
    latitude: -22.82223,
    longitude: -47.27137,
  },
  "Rua Sete de Setembro, 50, Centro, Valinhos, SP": {
    latitude: -22.97126,
    longitude: -46.99616,
  },
  "Avenida Francisco Glicério, 1000, Centro, Campinas, SP": {
    latitude: -22.90565,
    longitude: -47.05837,
  },
  "Rua Rosina Zagatti, 204, Jardim Amanda II, Hortolândia, SP": {
    latitude: -22.89426,
    longitude: -47.2346,
  },
  "Avenida John Boyd Dunlop, 3900, Jardim Ipaussurama, Campinas, SP": {
    latitude: -22.9234,
    longitude: -47.11211,
  },
};

// Geocoding: usa mock ou consulta ORS.
export const geocodeAddress = async (
  address: string
): Promise<LatLng | null> => {
  if (mockedCoordinates[address]) {
    return mockedCoordinates[address];
  }
  try {
    const response = await fetch(
      `https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(
        address
      )}`
    );
    const json = await response.json();
    if (json.features && json.features.length > 0) {
      const [longitude, latitude] = json.features[0].geometry.coordinates;
      return { latitude, longitude };
    }
    return null;
  } catch (error) {
    console.error("Erro no Geocoding:", error);
    return null;
  }
};
