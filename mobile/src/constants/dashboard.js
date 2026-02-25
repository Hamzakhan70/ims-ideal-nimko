import { ORDER_STATUS } from './orderStatus';
import { ROUTES } from './routes';

export const SALESMAN_ORDER_FILTERS = [
  'all',
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY,
  ORDER_STATUS.DELIVERED
];

export const SALESMAN_QUICK_ACTIONS = [
  {
    icon: 'O',
    title: 'Place Order',
    subtitle: 'Create order for assigned shopkeeper',
    route: ROUTES.SALESMAN.PLACE_ORDER
  },
  {
    icon: 'R',
    title: 'Recovery Board',
    subtitle: 'Collect and track recoveries',
    route: ROUTES.SALESMAN.RECOVERY
  }
];
