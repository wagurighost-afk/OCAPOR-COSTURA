import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProduct } from '@/services/productService';
import { useCategories } from '@/hooks/useProducts';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/EmptyState';
import { validateProductForm } from '@/utils/stock';
import { GENDER_OPTIONS } from '@/constants';
import type { ProductFormData } from '@/types';

const initialForm: ProductFormData = {
  name: '',
  code: '',
  categoryId: '',
  subcategory: '',
  model: '',
  gender: '',
  size: '',
  color: '',
  currentStock: 0,
  minimumStock: 0,
  idealStock: 0,
  maximumStock: 0,
  notes: '',
};

export function ProductFormPage() {
  const navigate = useNavigate();
  const { categories, loading: loadingCategories } = useCategories();
  const [form, setForm] = useState<ProductFormData>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function updateField<K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError('');

    const validationErrors = validateProductForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const product = await createProduct(form);
      navigate(`/estoque/${product.id}`, { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao cadastrar peça');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingCategories) return <LoadingState message="Carregando categorias..." />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button
        type="button"
        onClick={() => navigate('/estoque')}
        className="text-sm font-medium text-brand-700 hover:underline"
      >
        ← Voltar ao estoque
      </button>

      <div>
        <h2 className="text-xl font-bold text-slate-900">Cadastrar peça</h2>
        <p className="text-sm text-slate-500">
          Preencha os dados da nova peça
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <Input
          label="Nome *"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          error={errors.name}
          placeholder="Ex: Camisa Feminina"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Código *"
            value={form.code}
            onChange={(e) => updateField('code', e.target.value)}
            error={errors.code}
            placeholder="Ex: CF-M-001"
          />
          <Select
            label="Categoria *"
            value={form.categoryId}
            onChange={(e) => updateField('categoryId', e.target.value)}
            error={errors.categoryId}
            placeholder="Selecione..."
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Tamanho *"
            value={form.size}
            onChange={(e) => updateField('size', e.target.value)}
            error={errors.size}
            placeholder="Ex: M, G, Casal"
          />
          <Input
            label="Cor"
            value={form.color ?? ''}
            onChange={(e) => updateField('color', e.target.value)}
            placeholder="Ex: Branca"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Modelo"
            value={form.model ?? ''}
            onChange={(e) => updateField('model', e.target.value)}
            placeholder="Ex: Operacional"
          />
          <Select
            label="Gênero"
            value={form.gender ?? ''}
            onChange={(e) => updateField('gender', e.target.value)}
            placeholder="Selecione..."
            options={GENDER_OPTIONS.map((g) => ({
              value: g.value,
              label: g.label,
            }))}
          />
        </div>

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <Input
            label="Estoque inicial"
            type="number"
            min={0}
            value={form.currentStock}
            onChange={(e) => updateField('currentStock', Number(e.target.value))}
            error={errors.currentStock}
          />
          <Input
            label="Mínimo"
            type="number"
            min={0}
            value={form.minimumStock}
            onChange={(e) => updateField('minimumStock', Number(e.target.value))}
            error={errors.minimumStock}
          />
          <Input
            label="Ideal"
            type="number"
            min={0}
            value={form.idealStock}
            onChange={(e) => updateField('idealStock', Number(e.target.value))}
            error={errors.idealStock}
          />
          <Input
            label="Máximo"
            type="number"
            min={0}
            value={form.maximumStock}
            onChange={(e) => updateField('maximumStock', Number(e.target.value))}
            error={errors.maximumStock}
          />
        </div>

        <Textarea
          label="Observação"
          value={form.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Informações adicionais..."
        />

        {submitError && (
          <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {submitError}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => navigate('/estoque')}
          >
            Cancelar
          </Button>
          <Button type="submit" fullWidth loading={submitting}>
            Cadastrar peça
          </Button>
        </div>
      </form>
    </div>
  );
}
