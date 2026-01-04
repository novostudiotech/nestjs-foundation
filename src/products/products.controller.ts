import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  AllowAnonymous,
  OptionalAuth,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { ValidationErrorDto } from '../app/dto/validation-error.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product (requires authentication)' })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    type: ValidationErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  create(@Body() createProductDto: CreateProductDto, @Session() session: UserSession) {
    return {
      message: 'Product created successfully',
      product: this.productsService.create(createProductDto, session.user.id),
    };
  }

  @Get()
  @AllowAnonymous()
  @ApiOperation({
    summary: 'Get all products with filtering, sorting, and pagination',
    description:
      'Supports query parameters for filtering by category, status, price range, stock availability, search, sorting, and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of products',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
    type: ValidationErrorDto,
  })
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Get('mine')
  @ApiOperation({
    summary: 'Get current user products (protected route)',
    description:
      'Example of a protected route that requires authentication. Returns all products created by the current user with filtering, sorting, and pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of products created by the current user',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
    type: ValidationErrorDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMine(@Session() session: UserSession, @Query() query: QueryProductDto) {
    return this.productsService.findByUserId(session.user.id, query);
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOperation({
    summary: 'Get a product by ID',
    description:
      'Returns product details. If authenticated and the product belongs to the current user, includes isOwner flag.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the product with ownership information if authenticated',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  findOne(@Param('id') id: string, @Session() session: UserSession | null) {
    const product = this.productsService.findOne(id);
    const isOwner = session ? product.createdBy === session.user.id : false;

    return {
      product,
      isOwner,
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a product (full update, requires authentication)',
    description:
      'Replaces the entire product with the provided data. Required fields: name, price, category. Other fields are optional or have default values.',
  })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    type: ValidationErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  update(
    @Param('id') id: string,
    @Body() updateProductDto: CreateProductDto,
    @Session() _session: UserSession
  ) {
    return {
      message: 'Product updated successfully',
      product: this.productsService.update(id, updateProductDto),
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Partially update a product (requires authentication)',
    description:
      'Updates only the provided fields. All fields are optional. Tests PATCH body parser.',
  })
  @ApiResponse({
    status: 200,
    description: 'Product partially updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    type: ValidationErrorDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  patch(
    @Param('id') id: string,
    @Body() patchProductDto: UpdateProductDto,
    @Session() _session: UserSession
  ) {
    return {
      message: 'Product partially updated successfully',
      product: this.productsService.patch(id, patchProductDto),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product (requires authentication)' })
  @ApiResponse({
    status: 204,
    description: 'Product deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  remove(@Param('id') id: string, @Session() _session: UserSession) {
    this.productsService.remove(id);
  }
}
