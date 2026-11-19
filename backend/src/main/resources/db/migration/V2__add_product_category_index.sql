-- TRENIX V2: Product category index

CREATE INDEX idx_products_category_id
ON public.products(category_id);