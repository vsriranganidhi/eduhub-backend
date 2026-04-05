import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttleConfig: ThrottlerModuleOptions = [
  {
    name: 'global',
    ttl: 60000,
    limit: 1000,
  },
  {
    name: 'login',
    ttl: 900000,
    limit: 50,
  },
  {
    name: 'register',
    ttl: 3600000,
    limit: 30,
  },
  {
    name: 'invite',
    ttl: 3600000,
    limit: 100,
  },
  {
    name: 'passwordReset',
    ttl: 3600000,
    limit: 30,
  },
];
