/*
*
* 标签控制器
*
*/

const Tag = require('../model/tag.model')
const Article = require('../model/article.model')
const {
  handleRequest,
  handleSuccess,
	handleThrottle,
	handleError
} = require("../utils/handle")

const authIsVerified = require('../utils/auth')
const tagCtrl = { list: {}, item: {} }

// 增加标签
tagCtrl.list.POST = async ctx => {

	const { name, descript } = ctx.request.body

	// 添加前，先验证是否有相同 name
	const res = await Tag
							.find({ name })
							.catch(err => handleError({ ctx, message: '服务器内部错误' }))
	if (res && res.length !== 0) {
		handleError({ ctx, message: '已存在相同标签名' })
		return false
	}

	const tag = await new Tag({ name, descript })
										.save()
										.catch(err => handleError({ ctx, message: '服务器内部错误' }))
	if (tag) handleSuccess({ ctx, message: '发布标签成功', result: tag })
	else handleError({ ctx, message: '发布标签失败' })
}

// 获取标签
tagCtrl.list.GET = async ctx => {
	const { current_page = 1, page_size = 18, keyword = '' } = ctx.query

	// 过滤条件
  const options = {
    sort: { sort: 1 },
    page: Number(current_page),
    limit: Number(page_size)
	}

	// 参数
	const querys = {
		name: new RegExp(keyword)
	}

	const tag = await Tag
							.paginate(querys, options)
							.catch(err => ctx.throw(500, '服务器内部错误'))
	if (tag) {

		let tagClone = JSON.parse(JSON.stringify(tag))

		// 查找文章中标签聚合
		let $match = {}

		// 前台请求时，只有已经发布的和公开
		if(!authIsVerified(ctx.request)) $match = { state: 1, publish: 1 }

		const article = await Article.aggregate([
										{ $match },
										{ $unwind : "$tag" }, 
										{ $group: {
											_id: "$tag", 
											num_tutorial: { $sum : 1 }}
										}
									])
		if (article) {
			tagClone.docs.forEach(t => {
				const finded = article.find(c => String(c._id) === String(t._id))
				t.count = finded ? finded.num_tutorial : 0
			})
			handleSuccess({
				ctx,
				result: {
					pagination: {
						total: tagClone.total,
						current_page: tagClone.page,
						total_page: tagClone.pages,
						page_size: tagClone.limit
					},
					list: tagClone.docs
				},
				message: '列表数据获取成功!'
			})
		} else handleError({ ctx, message: '获取标签列表失败' })
	} else handleError({ ctx, message: '获取标签列表失败' })
}

// 删除标签
tagCtrl.item.DELETE = async ctx => {
	const _id = ctx.params.id
	
	if (!_id) {
		handleError({ ctx, message: '无效参数'})
		return false
	}

	let res = await Tag
									.findByIdAndRemove(_id)
									.catch(err => ctx.throw(500, '服务器内部错误'))
	if (res) handleSuccess({ ctx, message: '删除数据成功' })
	else handleError({ ctx, message: '删除数据失败'})
}

// 排序
tagCtrl.list.PATCH = async ctx => {
	
		const { ids } = ctx.request.body
	
		try {
			for (let i = 0; i < ids.length; i++) {
				await Tag
					.findByIdAndUpdate(ids[i], { sort: i + 1 })
					.catch(err => ctx.throw(500, '服务器内部错误'))
			}
			handleSuccess({ ctx, message: '排序成功' })
		} catch (error) {
			console.log(error)
			handleError({ ctx, message: '排序失败' })
		}
	}

// 修改标签
tagCtrl.item.PUT = async ctx => {

	const _id = ctx.params.id

	const { name, descript } = ctx.request.body

	if (!_id) {
		handleError({ ctx, message: '无效参数'})
		return false
	}

	const res = await Tag
										.findByIdAndUpdate(_id, { name, descript }, { new: true })
										.catch(err => ctx.throw(500, '服务器内部错误'))
	if (res) handleSuccess({ ctx, message: '修改标签成功' })
	else handleError({ ctx, message: '修改标签失败' })
}



exports.list = ctx => handleRequest({ ctx, controller: tagCtrl.list })
exports.item = ctx => handleRequest({ ctx, controller: tagCtrl.item })
