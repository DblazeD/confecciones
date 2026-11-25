"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { requireOwner, sessionClient } from "./supabase";

export type FormState = { error?: string; success?: string };

function field(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function id(form: FormData, key: string) {
  const value = Number(field(form, key));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function price(form: FormData, key: string) {
  const raw = field(form, key);
  return /^\d{1,10}(\.\d{1,2})?$/.test(raw) ? Number(raw) : null;
}

function phone(value: string) {
  const digits = value.replace(/[\s+().-]/g, "");
  return digits.startsWith("57") && digits.length === 12 ? digits.slice(2) : digits;
}

function fail(error: string): FormState {
  return { error };
}

function done(path: string, success: string): FormState {
  revalidatePath(path);
  if (path !== "/") revalidatePath("/");
  return { success };
}

export async function signIn(_state: FormState, form: FormData): Promise<FormState> {
  const db = await sessionClient();
  if (!db) return fail("Configura la conexión con Supabase para iniciar sesión.");
  const email = field(form, "email");
  const password = form.get("password");
  if (!email || typeof password !== "string" || !password) return fail("Escribe tu correo y contraseña.");
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return fail("El correo o la contraseña son incorrectos.");
  const { data: owner } = await db.rpc("is_owner");
  if (!owner) {
    await db.auth.signOut({ scope: "local" });
    return fail("Esta cuenta no tiene acceso al panel.");
  }
  redirect("/admin");
}

export async function signOut() {
  const db = await sessionClient();
  await db?.auth.signOut({ scope: "local" });
  redirect("/acceso");
}

export async function saveProduct(_state: FormState, form: FormData): Promise<FormState> {
  const db = await requireOwner();
  const productId = id(form, "id");
  const categoryId = id(form, "category");
  const name = field(form, "name");
  const salePrice = price(form, "price");
  const cost = field(form, "cost") ? price(form, "cost") : 0;
  if (!categoryId || !name || salePrice === null || cost === null) {
    return fail("Indica el nombre, una categoría y precios válidos.");
  }
  const availability = field(form, "availability");
  const values = {
    category_id: categoryId, name,
    price: salePrice, cost,
    description: field(form, "description"),
    fabric: field(form, "fabric"),
    color: field(form, "color"),
    size: field(form, "size"),
    published: form.get("published") === "on",
    availability_override: availability === "auto" ? null : availability === "available",
  };
  const request = productId
    ? db.from("products").update(values).eq("id", productId)
    : db.from("products").insert(values);
  const { data, error } = await request.select("id").single();
  if (error) return fail("No se pudo guardar el producto. Revisa la categoría y los datos.");
  revalidatePath("/producto/" + data.id);
  done("/admin/productos", "Producto guardado.");
  if (!productId) redirect("/admin/productos/" + data.id);
  return { success: "Producto guardado." };
}

export async function toggleArchive(_state: FormState, form: FormData): Promise<FormState> {
  const db = await requireOwner();
  const productId = id(form, "id");
  if (!productId) return fail("Producto inválido.");
  const archived = field(form, "mode") === "archive";
  const { error } = await db.from("products").update({ archived }).eq("id", productId).select("id").single();
  if (error) return fail("No se pudo actualizar el producto.");
  revalidatePath("/producto/" + productId);
  revalidatePath("/admin/productos/" + productId);
  return done("/admin/productos", archived ? "Producto archivado." : "Producto restaurado.");
}

export async function saveCategory(_state: FormState, form: FormData): Promise<FormState> {
  const db = await requireOwner();
  const categoryId = id(form, "id");
  const name = field(form, "name");
  const remove = field(form, "mode") === "delete";
  if (remove && !categoryId) return fail("Categoría inválida.");
  if (!remove && !name) return fail("Escribe el nombre de la categoría.");
  const request = remove
    ? db.from("categories").delete().eq("id", categoryId)
    : categoryId
      ? db.from("categories").update({ name }).eq("id", categoryId)
      : db.from("categories").insert({ name });
  const { error } = await request.select("id").single();
  if (error?.code === "23503" || error?.code === "23001") return fail("Reasigna los productos antes de eliminar la categoría.");
  if (error?.code === "23505") return fail("Ya existe una categoría con ese nombre.");
  if (error) return fail("No se pudo guardar la categoría.");
  return done("/admin/productos", remove ? "Categoría eliminada." : "Categoría guardada.");
}

async function uploadImage(db: Awaited<ReturnType<typeof requireOwner>>, file: File) {
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error("Selecciona una imagen de hasta 10 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  let compressed: Buffer;
  try {
    const image = sharp(bytes, { limitInputPixels: 40_000_000 });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp", "avif"].includes(metadata.format ?? "")) {
      throw new Error("Formato no admitido");
    }
    compressed = await image.rotate().resize(1200, 1200, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    if (compressed.length > 200_000) {
      compressed = await sharp(compressed).resize(800, 800, { fit: "inside" }).webp({ quality: 61 }).toBuffer();
    }
    if (compressed.length > 200_000) throw new Error("Imagen demasiado pesada");
  } catch {
    throw new Error("No se pudo procesar la imagen. Usa JPG, PNG, WebP o AVIF.");
  }
  const name = randomUUID() + ".webp";
  const { error } = await db.storage.from("catalog-media").upload(name, compressed, { contentType: "image/webp" });
  if (error) throw new Error("No se pudo subir la imagen.");
  return name;
}

export async function changePhoto(_state: FormState, form: FormData): Promise<FormState> {
  const db = await requireOwner();
  const productId = id(form, "id");
  if (!productId) return fail("Producto inválido.");
  const mode = field(form, "mode");
  let uploaded = "";
  if (mode === "add") {
    const file = form.get("photo");
    if (!(file instanceof File)) return fail("Selecciona una imagen.");
    try {
      uploaded = await uploadImage(db, file);
    } catch (error) {
      return fail((error as Error).message);
    }
  }
  const name = uploaded || field(form, "name");
  const { error } = await db.rpc("change_product_photo", { product: productId, operation: mode, photo: name });
  if (error && uploaded) await db.storage.from("catalog-media").remove([uploaded]);
  if (error) return fail(error.code === "22023" ? error.message : "No se pudo actualizar la foto.");
  if (mode === "remove") await db.storage.from("catalog-media").remove([name]);
  revalidatePath("/producto/" + productId);
  return done("/admin/productos/" + productId, "Fotos actualizadas.");
}

export async function moveStock(_state: FormState, form: FormData): Promise<FormState> {
  const db = await requireOwner();
  const product = id(form, "product");
  const quantity = id(form, "quantity");
  const reason = field(form, "reason");
  const date = field(form, "date");
  if (!product || !quantity || quantity > 1_000_000 || !reason || !date) {
    return fail("Indica el producto, una cantidad positiva, la fecha y el motivo.");
  }
  const { error } = await db.rpc("move_stock", {
    product, amount: field(form, "direction") === "out" ? -quantity : quantity,
    reason, movement_date: date,
  });
  if (error) return fail(error.code === "22023" ? error.message : "No se pudo registrar el movimiento.");
  revalidatePath("/producto/" + product);
  return done("/admin/inventario", "Movimiento registrado.");
}

export async function saveCustomer(_state: FormState, form: FormData): Promise<FormState> {
  const db = await requireOwner();
  const customerId = id(form, "id");
  const name = field(form, "name");
  const normalizedPhone = phone(field(form, "phone"));
  if (!name || !/^\d{7,15}$/.test(normalizedPhone)) return fail("Indica un nombre y un teléfono válido.");
  const values = { name, phone: normalizedPhone, notes: field(form, "notes") };
  const request = customerId
    ? db.from("customers").update(values).eq("id", customerId)
    : db.from("customers").insert(values);
  const { error } = await request.select("id").single();
  if (error?.code === "23505") return fail("Ya hay un cliente con ese teléfono.");
  if (error) return fail("No se pudo guardar el cliente.");
  revalidatePath("/admin/pedidos");
  return done("/admin/clientes", "Cliente guardado.");
}

export async function saveOrder(_state: FormState, form: FormData): Promise<FormState> {
  const db = await requireOwner();
  const orderId = id(form, "id");
  const customerId = id(form, "customer");
  const description = field(form, "description");
  const orderPrice = price(form, "price");
  const received = field(form, "received");
  const due = field(form, "due");
  if (!customerId || !description || orderPrice === null || !received || !due || due < received) {
    return fail("Completa el cliente, la descripción y el precio. La entrega debe ser el día de recepción o después.");
  }
  const values = {
    customer_id: customerId, description, price: orderPrice,
    kind: field(form, "kind"), received_date: received, due_date: due, urgent: form.get("urgent") === "on",
  };
  const request = orderId
    ? db.from("orders").update(values).eq("id", orderId)
    : db.from("orders").insert(values);
  const { data, error } = await request.select("id").single();
  if (error) return fail("No se pudo guardar el pedido. Revisa los datos.");
  revalidatePath("/admin/pedidos/" + data.id);
  done("/admin/pedidos", "Pedido guardado.");
  if (!orderId) redirect("/admin/pedidos/" + data.id);
  return { success: "Pedido guardado." };
}

export async function updateStatus(_state: FormState, form: FormData): Promise<FormState> {
  const db = await requireOwner();
  const orderId = id(form, "id");
  const status = field(form, "status");
  const reason = field(form, "reason");
  if (!orderId || !["recibido", "en_proceso", "listo", "entregado", "cancelado"].includes(status)) {
    return fail("Selecciona un estado válido.");
  }
  if (status === "cancelado" && !reason) return fail("Escribe el motivo de cancelación.");
  const { error } = await db.from("orders").update({ status, cancellation_reason: reason }).eq("id", orderId).select("id").single();
  if (error) return fail("No se pudo cambiar el estado.");
  revalidatePath("/admin/pedidos/" + orderId);
  return done("/admin/pedidos", "Estado actualizado.");
}

export async function saveBrand(_state: FormState, form: FormData): Promise<FormState> {
  const db = await requireOwner();
  const name = field(form, "name");
  const color = field(form, "color");
  const contact = phone(field(form, "phone"));
  const whatsapp = field(form, "whatsapp").replace(/[\s+().-]/g, "");
  if (!name || !/^#[0-9a-f]{6}$/i.test(color)) return fail("Indica un nombre y un color válidos.");
  if ((contact && !/^\d{7,15}$/.test(contact)) || (whatsapp && !/^\d{10,15}$/.test(whatsapp))) {
    return fail("Revisa el teléfono e incluye el indicativo internacional en WhatsApp.");
  }
  const file = form.get("logo");
  let uploaded = "";
  if (file instanceof File && file.size) {
    try {
      uploaded = await uploadImage(db, file);
    } catch (error) {
      return fail((error as Error).message);
    }
  }
  const { data: previous } = await db.from("brand_settings").select("logo").eq("id", 1).single();
  const updatedLogo = uploaded || (form.get("removeLogo") === "on" ? "" : previous?.logo ?? "");
  const { error } = await db.from("brand_settings").update({
    name, primary_color: color, phone: contact, whatsapp, payment_methods: field(form, "payments"),
    logo: updatedLogo,
  }).eq("id", 1).eq("logo", previous?.logo ?? "").select("id").single();
  if (error && uploaded) await db.storage.from("catalog-media").remove([uploaded]);
  if (error) return fail("No se pudieron guardar los cambios. Recarga la página e inténtalo de nuevo.");
  if (previous?.logo && previous.logo !== updatedLogo) await db.storage.from("catalog-media").remove([previous.logo]);
  revalidatePath("/", "layout");
  return done("/admin/configuracion", "Configuración guardada.");
}
