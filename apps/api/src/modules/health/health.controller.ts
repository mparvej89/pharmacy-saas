import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService, DatabaseHealthStatus } from './health.service';
import { Public } from '@/common/guards/jwt-auth.guard';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Application and Neon PostgreSQL connectivity health check',
    description: 'Verifies database connectivity and latency without exposing credentials or connection strings.',
  })
  @ApiResponse({ status: 200, description: 'Database and API are healthy' })
  @ApiResponse({ status: 503, description: 'Database is unreachable' })
  async checkHealth(): Promise<DatabaseHealthStatus> {
    return this.healthService.checkDatabaseHealth();
  }

  @Get('db')
  @ApiOperation({
    summary: 'Database connectivity health check',
    description: 'Executes a lightweight SELECT 1 query against PostgreSQL and reports connection pool / TLS status.',
  })
  @ApiResponse({ status: 200, description: 'Database is reachable' })
  @ApiResponse({ status: 503, description: 'Database is unreachable' })
  async checkDatabase(): Promise<DatabaseHealthStatus> {
    return this.healthService.checkDatabaseHealth();
  }
}

