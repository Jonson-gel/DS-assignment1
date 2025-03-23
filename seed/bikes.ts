import { Bike, Station } from "../shared/types";

export const bikes: Bike[] = [
  {
    bikeId: 1,
    stationId: 101,
    status: 0,
    batteryLevel: 85,
  },
  {
    bikeId: 2,
    stationId: 101,
    status: 1,
    batteryLevel: 50,
  },
  {
    bikeId: 3,
    stationId: 102,
    status: 0,
    batteryLevel: 10,
  }
];

export const stations: Station[] = [
  {
    stationId: 101,
    name: "Shopping Mall",
    location: { latitude: 40.785091, longitude: -73.968285 },
    capacity: 20,
    availableBikes: 5,
    translations: {
      zh: "购物中心",
    }
  },
  {
    stationId: 102,
    name: "Times Square",
    location: { latitude: 40.758896, longitude: -73.985130 },
    capacity: 15,
    availableBikes: 3,
    translations: {
      zh: "时代广场",
    }
  }
];
