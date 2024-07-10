import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, BaseEntity } from 'typeorm';
import { Article } from './article.entity';

@Entity()
export class Photo extends BaseEntity {
  @PrimaryGeneratedColumn()
  photoId: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  fileName: string;

  @Column({ type: 'int', nullable: false })
  articleId: number;

  @ManyToOne(() => Article, (article) => article.photos, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'articleId' })
  article: Article;
}
