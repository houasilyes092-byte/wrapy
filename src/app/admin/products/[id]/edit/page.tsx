"use client";

import { useEffect, useState, use } from "react";
import ProductForm from "@/components/admin/ProductForm";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  images: string[];
  compatibleModels: string[];
  stock: number;
  madeToOrder: boolean;
  collectionId: string | null;
  tags: string[];
  isBestSeller: boolean;
  isFeatured: boolean;
  isActive: boolean;
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-center py-20 text-dark-muted">Loading...</div>;
  }

  if (!product) {
    return <div className="text-center py-20 text-red-400">Product not found</div>;
  }

  return <ProductForm product={product} />;
}
