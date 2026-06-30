import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@ApiTags('products')
@Public()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.productsService.findById(id);
  }

  @Get(':id/related')
  findRelated(@Param('id', ParseObjectIdPipe) id: string) {
    return this.productsService.findRelated(id);
  }
}
