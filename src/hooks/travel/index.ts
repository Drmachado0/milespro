// Types
export type {
  TravelClient,
  TravelTicket,
  TravelHotelReservation,
  TravelCarRental,
  TravelQuote,
  TravelReceivable,
  AgencySettings,
  TravelCruise,
  TravelInsurance,
  TravelAttraction,
  TravelTransfer,
} from './types';

// Clients
export {
  useTravelClients,
  useCreateTravelClient,
  useUpdateTravelClient,
  useDeleteTravelClient,
} from './useTravelClients';

// Tickets
export {
  useTravelTickets,
  useCreateTravelTicket,
  useUpdateTravelTicket,
  useDeleteTravelTicket,
} from './useTravelTickets';

// Hotels
export {
  useTravelHotelReservations,
  useCreateTravelHotelReservation,
  useUpdateTravelHotelReservation,
  useDeleteTravelHotelReservation,
} from './useTravelHotels';

// Cars
export {
  useTravelCarRentals,
  useCreateTravelCarRental,
  useUpdateTravelCarRental,
  useDeleteTravelCarRental,
} from './useTravelCars';

// Quotes
export {
  useTravelQuotes,
  useCreateTravelQuote,
  useUpdateTravelQuote,
  useDeleteTravelQuote,
} from './useTravelQuotes';

// Receivables
export {
  useTravelReceivables,
  useCreateTravelReceivable,
  useUpdateTravelReceivable,
  useDeleteTravelReceivable,
} from './useTravelReceivables';

// Agency Settings
export {
  useAgencySettings,
  useUpdateAgencySettings,
} from './useAgencySettings';

// Stats
export { useTravelAgencyStats } from './useTravelStats';

// Cruises
export {
  useTravelCruises,
  useCreateTravelCruise,
  useUpdateTravelCruise,
  useDeleteTravelCruise,
} from './useTravelCruises';

// Insurances
export {
  useTravelInsurances,
  useCreateTravelInsurance,
  useUpdateTravelInsurance,
  useDeleteTravelInsurance,
} from './useTravelInsurances';

// Attractions
export {
  useTravelAttractions,
  useCreateTravelAttraction,
  useUpdateTravelAttraction,
  useDeleteTravelAttraction,
} from './useTravelAttractions';

// Transfers
export {
  useTravelTransfers,
  useCreateTravelTransfer,
  useUpdateTravelTransfer,
  useDeleteTravelTransfer,
} from './useTravelTransfers';

// Total Savings
export { useTotalSavings } from './useTotalSavings';
export type { SavingsItem, SavingsByCategory, MonthlySavings } from './useTotalSavings';

// Google Calendar
export { useGoogleCalendar } from './useGoogleCalendar';
export type { ReservationType } from './useGoogleCalendar';
