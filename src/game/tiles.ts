export type TileKind = {
  id: number;
  key: string;
  name: string;
  src: string;
  accent: string;
};

export const TILE_KINDS: TileKind[] = [
  { id: 0, key: "sheep", name: "绵羊", src: "/tiles/tile-1.png", accent: "#f3efe6" },
  { id: 1, key: "wool", name: "毛线", src: "/tiles/tile-2.png", accent: "#efe4cc" },
  { id: 2, key: "clover", name: "三叶草", src: "/tiles/tile-3.png", accent: "#d7ead0" },
  { id: 3, key: "carrot", name: "胡萝卜", src: "/tiles/tile-4.png", accent: "#f3d7c0" },
  { id: 4, key: "apple", name: "苹果", src: "/tiles/tile-5.png", accent: "#f0d0c8" },
  { id: 5, key: "sunflower", name: "向日葵", src: "/tiles/tile-6.png", accent: "#efe3b8" },
  { id: 6, key: "chick", name: "小鸡", src: "/tiles/tile-7.png", accent: "#f3e6b8" },
  { id: 7, key: "mushroom", name: "蘑菇", src: "/tiles/tile-8.png", accent: "#f0d4d0" },
  { id: 8, key: "corn", name: "玉米", src: "/tiles/tile-9.png", accent: "#efe6b4" },
  { id: 9, key: "berry", name: "草莓", src: "/tiles/tile-10.png", accent: "#f0cfd0" },
  { id: 10, key: "milk", name: "牛奶", src: "/tiles/tile-11.png", accent: "#e8eef0" },
  { id: 11, key: "bell", name: "铃铛", src: "/tiles/tile-12.png", accent: "#eadcc0" },
  { id: 12, key: "honey", name: "蜂蜜", src: "/tiles/tile-13.png", accent: "#efe0b0" },
  { id: 13, key: "leaf", name: "叶子", src: "/tiles/tile-14.png", accent: "#d6e8c8" },
  { id: 14, key: "butterfly", name: "蝴蝶", src: "/tiles/tile-15.png", accent: "#f0d8c0" },
  { id: 15, key: "basket", name: "竹篮", src: "/tiles/tile-16.png", accent: "#e8d8c0" },
];
