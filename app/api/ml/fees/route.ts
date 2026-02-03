import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')
    
    if (!categoryId) {
      return NextResponse.json(
        { error: 'category_id é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar informações da categoria que contém as taxas
    const categoryResponse = await fetch(
      `https://api.mercadolibre.com/categories/${categoryId}`
    )
    
    if (!categoryResponse.ok) {
      throw new Error('Falha ao buscar informações da categoria')
    }
    
    const categoryData = await categoryResponse.json()
    
    // Extrair taxas dos settings da categoria
    const settings = categoryData.settings?.listing_types || []
    
    let classicoPercent = null
    let premiumPercent = null
    
    // Procurar por gold_pro (Clássico) e gold_special (Premium)
    for (const listingType of settings) {
      if (listingType.id === 'gold_pro' && listingType.sale_fees && listingType.sale_fees.length > 0) {
        // sale_fees geralmente é um array, pegar o primeiro
        const fee = listingType.sale_fees[0]
        if (fee.ratio !== undefined) {
          classicoPercent = fee.ratio * 100
        } else if (fee.percentage !== undefined) {
          classicoPercent = fee.percentage
        }
      }
      
      if (listingType.id === 'gold_special' && listingType.sale_fees && listingType.sale_fees.length > 0) {
        const fee = listingType.sale_fees[0]
        if (fee.ratio !== undefined) {
          premiumPercent = fee.ratio * 100
        } else if (fee.percentage !== undefined) {
          premiumPercent = fee.percentage
        }
      }
    }
    
    // Se não encontrou nas settings, tentar buscar via listing_prices
    if (classicoPercent === null || premiumPercent === null) {
      try {
        const [classicoPriceResponse, premiumPriceResponse] = await Promise.all([
          fetch(`https://api.mercadolibre.com/sites/MLB/listing_prices?price=100&category_id=${categoryId}&listing_type_id=gold_pro`).catch(() => null),
          fetch(`https://api.mercadolibre.com/sites/MLB/listing_prices?price=100&category_id=${categoryId}&listing_type_id=gold_special`).catch(() => null)
        ])
        
        if (classicoPriceResponse?.ok && classicoPercent === null) {
          const classicoData = await classicoPriceResponse.json()
          if (classicoData.sale_fee && classicoData.sale_fee.length > 0) {
            const fee = classicoData.sale_fee[0]
            if (fee.ratio !== undefined) {
              classicoPercent = fee.ratio * 100
            }
          }
        }
        
        if (premiumPriceResponse?.ok && premiumPercent === null) {
          const premiumData = await premiumPriceResponse.json()
          if (premiumData.sale_fee && premiumData.sale_fee.length > 0) {
            const fee = premiumData.sale_fee[0]
            if (fee.ratio !== undefined) {
              premiumPercent = fee.ratio * 100
            }
          }
        }
      } catch (e) {
        // Ignorar erros da API de listing_prices
      }
    }
    
    return NextResponse.json({
      classico: classicoPercent,
      premium: premiumPercent,
    })
  } catch (error) {
    console.error('Erro ao buscar taxas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar taxas da categoria' },
      { status: 500 }
    )
  }
}
