import { createClient, Client } from '@libsql/client';

const globalForDb = globalThis as unknown as {
  db: Client | undefined
};

const url = process.env.DATABASE_URL || '';
const authToken = process.env.DATABASE_AUTH_TOKEN || '';

export const libsql = globalForDb.db ?? createClient(
  url.startsWith('libsql://')
    ? { url, authToken }
    : { url: 'file:./db/dev.db' }
);

if (process.env.NODE_ENV !== 'production') globalForDb.db = libsql;

// Simple query helper
export async function query(sql: string, params: any[] = []) {
  return libsql.execute({ sql, args: params });
}

// Property helpers
export const property = {
  async findMany(opts: any = {}) {
    const { where = {}, orderBy = { createdAt: 'desc' }, include } = opts;
    const conditions: string[] = [];
    const params: any[] = [];

    if (where.propertyType) { conditions.push('propertyType = ?'); params.push(where.propertyType); }
    if (where.transactionType) { conditions.push('transactionType = ?'); params.push(where.transactionType); }
    if (where.status) { conditions.push('status = ?'); params.push(where.status); }
    if (where.city?.contains) { conditions.push('city LIKE ?'); params.push(`%${where.city.contains}%`); }

    if (where.OR) {
      const orParts: string[] = [];
      for (const cond of where.OR) {
        if (cond.title?.contains) { orParts.push('title LIKE ?'); params.push(`%${cond.title.contains}%`); }
        if (cond.description?.contains) { orParts.push('description LIKE ?'); params.push(`%${cond.description?.contains}%`); }
        if (cond.address?.contains) { orParts.push('address LIKE ?'); params.push(`%${cond.address?.contains}%`); }
        if (cond.location?.contains) { orParts.push('location LIKE ?'); params.push(`%${cond.location?.contains}%`); }
      }
      if (orParts.length) conditions.push(`(${orParts.join(' OR ')})`);
    }

    if (where.price?.gte) { conditions.push('price >= ?'); params.push(where.price.gte); }
    if (where.price?.lte) { conditions.push('price <= ?'); params.push(where.price.lte); }
    if (where.area?.gte) { conditions.push('area >= ?'); params.push(where.area.gte); }

    const orderCol = orderBy.createdAt ? 'createdAt' : orderBy.id ? 'id' : 'createdAt';
    const orderDir = (Object.values(orderBy)[0] as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let sql = `SELECT * FROM Property`;
    if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
    sql += ` ORDER BY ${orderCol} ${orderDir}`;

    const result = await query(sql, params);
    let properties = result.rows.map((r: any) => ({ ...r, price: Number(r.price), area: r.area ? Number(r.area) : null }));

    if (include?._count?.inquiries) {
      for (const p of properties) {
        const countResult = await query('SELECT COUNT(*) as c FROM Inquiry WHERE propertyId = ?', [p.id]);
        (p as any)._count = { inquiries: Number(countResult.rows[0].c) };
      }
    }

    return { properties };
  },

  async findUnique(opts: { where: { id: string }; include?: any }) {
    const result = await query('SELECT * FROM Property WHERE id = ?', [opts.where.id]);
    if (!result.rows.length) return null;
    const p = { ...result.rows[0], price: Number(result.rows[0].price), area: result.rows[0].area ? Number(result.rows[0].area) : null };

    if (opts.include?.inquiries) {
      const inquiriesResult = await query('SELECT * FROM Inquiry WHERE propertyId = ? ORDER BY createdAt DESC', [p.id]);
      (p as any).inquiries = inquiriesResult.rows;
    }

    return { property: p };
  },

  async create(opts: { data: any }) {
    const d = opts.data;
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    await query(
      `INSERT INTO Property (id, title, description, propertyType, transactionType, price, area, location, city, address, rooms, bathrooms, floor, features, status, images, videos, audios, contactPhone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, d.title, d.description, d.propertyType, d.transactionType, d.price, d.area, d.location, d.city, d.address, d.rooms, d.bathrooms, d.floor, d.features, d.status, d.images, d.videos, d.audios, d.contactPhone]
    );
    const result = await query('SELECT * FROM Property WHERE id = ?', [id]);
    const property = { ...result.rows[0], price: Number(result.rows[0].price) };
    return { property };
  },

  async update(opts: { where: { id: string }; data: any }) {
    const d = opts.data;
    const fields: string[] = [];
    const params: any[] = [];
    if (d.title !== undefined) { fields.push('title = ?'); params.push(d.title); }
    if (d.description !== undefined) { fields.push('description = ?'); params.push(d.description); }
    if (d.propertyType !== undefined) { fields.push('propertyType = ?'); params.push(d.propertyType); }
    if (d.transactionType !== undefined) { fields.push('transactionType = ?'); params.push(d.transactionType); }
    if (d.price !== undefined) { fields.push('price = ?'); params.push(d.price); }
    if (d.area !== undefined) { fields.push('area = ?'); params.push(d.area); }
    if (d.location !== undefined) { fields.push('location = ?'); params.push(d.location); }
    if (d.city !== undefined) { fields.push('city = ?'); params.push(d.city); }
    if (d.address !== undefined) { fields.push('address = ?'); params.push(d.address); }
    if (d.rooms !== undefined) { fields.push('rooms = ?'); params.push(d.rooms); }
    if (d.bathrooms !== undefined) { fields.push('bathrooms = ?'); params.push(d.bathrooms); }
    if (d.floor !== undefined) { fields.push('floor = ?'); params.push(d.floor); }
    if (d.features !== undefined) { fields.push('features = ?'); params.push(d.features); }
    if (d.status !== undefined) { fields.push('status = ?'); params.push(d.status); }
    if (d.images !== undefined) { fields.push('images = ?'); params.push(d.images); }
    if (d.videos !== undefined) { fields.push('videos = ?'); params.push(d.videos); }
    if (d.audios !== undefined) { fields.push('audios = ?'); params.push(d.audios); }
    if (d.contactPhone !== undefined) { fields.push('contactPhone = ?'); params.push(d.contactPhone); }
    fields.push("updatedAt = datetime('now')");

    params.push(opts.where.id);
    await query(`UPDATE Property SET ${fields.join(', ')} WHERE id = ?`, params);
    const result = await query('SELECT * FROM Property WHERE id = ?', [opts.where.id]);
    const property = { ...result.rows[0], price: Number(result.rows[0].price), area: result.rows[0].area ? Number(result.rows[0].area) : null };
    return { property };
  },

  async delete(opts: { where: { id: string } }) {
    await query('DELETE FROM Inquiry WHERE propertyId = ?', [opts.where.id]);
    await query('DELETE FROM Property WHERE id = ?', [opts.where.id]);
    return {};
  },
};

// Inquiry helpers
export const inquiry = {
  async findMany(opts: any = {}) {
    const { where = {}, include, orderBy = { createdAt: 'desc' } } = opts;
    let sql = `SELECT * FROM Inquiry`;
    const params: any[] = [];
    if (where.propertyId) { sql += ' WHERE propertyId = ?'; params.push(where.propertyId); }
    sql += ` ORDER BY ${orderBy.createdAt ? 'createdAt' : 'id'} DESC`;
    const result = await query(sql, params);
    let inquiries = result.rows;

    if (include?.property) {
      for (const inq of inquiries) {
        const propResult = await query('SELECT id, title, propertyType, transactionType, status FROM Property WHERE id = ?', [inq.propertyId]);
        if (propResult.rows.length) (inq as any).property = propResult.rows[0];
      }
    }

    return { inquiries };
  },

  async create(opts: { data: any }) {
    const d = opts.data;
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    await query(
      `INSERT INTO Inquiry (id, propertyId, callerName, callerPhone, message, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, d.propertyId, d.callerName, d.callerPhone, d.message, d.status]
    );
    const result = await query('SELECT * FROM Inquiry WHERE id = ?', [id]);
    return { inquiry: result.rows[0] };
  },

  async update(opts: { where: { id: string }; data: any }) {
    const d = opts.data;
    const fields: string[] = [];
    const params: any[] = [];
    if (d.status !== undefined) { fields.push('status = ?'); params.push(d.status); }
    if (d.callerName !== undefined) { fields.push('callerName = ?'); params.push(d.callerName); }
    if (d.callerPhone !== undefined) { fields.push('callerPhone = ?'); params.push(d.callerPhone); }
    if (d.message !== undefined) { fields.push('message = ?'); params.push(d.message); }

    if (!fields.length) return {};
    params.push(opts.where.id);
    await query(`UPDATE Inquiry SET ${fields.join(', ')} WHERE id = ?`, params);
    const result = await query('SELECT * FROM Inquiry WHERE id = ?', [opts.where.id]);
    return { inquiry: result.rows[0] };
  },

  async delete(opts: { where: { id: string } }) {
    await query('DELETE FROM Inquiry WHERE id = ?', [opts.where.id]);
    return {};
  },
};