export default function KullanimKosullariPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-4 text-2xl font-bold text-foreground">Kullanım Koşulları</h1>
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Platforma kayıt olarak, burada paylaştığınız ilan, talep ve mesajların doğru ve yasal
          olduğunu, satış yapmaya yetkili olduğunuzu ve diğer üyelere karşı iyi niyetle
          davranacağınızı kabul edersiniz.
        </p>
        <p>
          Hesabınız, e-posta doğrulaması ve admin onayı sonrasında aktif olur. Sahte belge/bilgi
          ile kayıt, hesabın herhangi bir zamanda kapatılmasına yol açar. Alım-satım işlemleri
          doğrudan taraflar arasında gerçekleşir; platform bu işlemlere aracılık etmez ve
          sorumluluk kabul etmez.
        </p>
      </div>
    </div>
  );
}
