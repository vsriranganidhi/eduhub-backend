import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttleConfig: ThrottlerModuleOptions = [
  {
    name: 'global',
    ttl: 60000,
    limit: 100,
  },
  {
    name: 'login',
    ttl: 900000,
    limit: 5,
  },
  {
    name: 'register',
    ttl: 3600000,
    limit: 3,
  },
  {
    name: 'invite',
    ttl: 3600000,
    limit: 10,
  },
  {
    name: 'passwordReset',
    ttl: 3600000,
    limit: 3,
  },
];
