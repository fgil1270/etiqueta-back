import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('etiqueta_trazabilidad')
export class EtiquetaTrazabilidad {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar' })
    codigo!: string;

    @Column({ type: 'varchar' })
    modelo!: string;

    @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
    updatedAt!: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'datetime2' })
    deletedAt!: Date | null;
}