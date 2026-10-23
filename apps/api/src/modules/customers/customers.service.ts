import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(storeId: string, search?: string) {
    const where: any = { storeId };
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { sales: true },
        },
      },
    });
  }

  async findOne(storeId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, storeId },
      include: {
        sales: {
          orderBy: { saleDate: 'desc' },
          take: 20,
          include: {
            items: {
              include: {
                medicine: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    return customer;
  }

  async create(storeId: string, dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { storeId, phone: dto.phone.trim() },
    });

    if (existing) {
      throw new ConflictException(`A customer with phone "${dto.phone}" already exists in this pharmacy`);
    }

    return this.prisma.customer.create({
      data: {
        ...dto,
        storeId,
        phone: dto.phone.trim(),
      },
    });
  }

  async update(storeId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(storeId, id);

    if (dto.phone) {
      const conflict = await this.prisma.customer.findFirst({
        where: {
          storeId,
          phone: dto.phone.trim(),
          id: { not: id },
        },
      });
      if (conflict) {
        throw new ConflictException(`Another customer with phone "${dto.phone}" already exists`);
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        phone: dto.phone ? dto.phone.trim() : undefined,
      },
    });
  }
}
