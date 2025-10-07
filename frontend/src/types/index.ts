export interface Item {
  id: number;
  name: string;
  location: string;
}


export type Delivery = {
  id: number;
  client: string;
  addressStreet: string;  
  addressCity: string;    
  phone: string;
  obs: string;
  orderNumber: string;
  status: string;
  latitude: number;
  longitude: number;
};

export type UserType = "motorista" | "cliente" | null;